import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adapterModes, type Adapters } from "../adapters/index.ts";
import type { AdapterName, Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import { DomainError, errorMessage } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { SEED_CUSTOMER, SEED_JOB, SEED_WORKER } from "../store/seed.ts";
import type { ClaimRecord, EventRecord, JobPatch, JobRecord, Party, Store, UserRecord } from "../store/types.ts";
import { KeyedMutex } from "./keyedMutex.ts";
import { nextStatus, type JobAction } from "./stateMachine.ts";
import { formatNaira, toJobView, type JobView, type QuoteView } from "./view.ts";

export interface JobServiceOptions {
  store: Store;
  adapters: Adapters;
  logger: Logger;
  maxAmountKobo: number;
  coverDurationDays: number;
  /** Runs after a demo reset, e.g. to re-arm MOCK_FAIL. */
  onDemoReset?: () => void;
  now?: () => Date;
}

export interface CreateJobInput {
  customerId: string;
  workerId: string;
  title: string;
  amountKobo: number;
}

export interface FileClaimInput {
  filedBy: Party;
  reason: ClaimReason;
  details: string;
}

interface EventInput {
  type: string;
  detail: string;
}

interface TransitionOptions {
  set?: JobPatch;
  events: EventInput[];
  /** Records that this adapter ran, in the mode it ran in. */
  usedAdapter?: AdapterName;
  claim?: ClaimRecord;
}

const CLAIM_REASON_LABELS: Record<ClaimReason, string> = {
  damage: "property damage",
  injury: "injury",
  not_done: "job not done",
};

/**
 * Owns the job lifecycle. Pattern for every operation:
 *   1. take the per-job lock (so retries and double-clicks cannot double-charge),
 *   2. check the transition is allowed before calling out,
 *   3. call the adapter,
 *   4. write the transition + event(s) as one atomic, status-conditional store update.
 * A failed adapter call leaves the job where it was, so the same request can be retried.
 */
export class JobService {
  readonly #store: Store;
  readonly #adapters: Adapters;
  readonly #log: Logger;
  readonly #maxAmountKobo: number;
  readonly #coverDurationDays: number;
  readonly #onDemoReset: (() => void) | undefined;
  readonly #now: () => Date;
  readonly #locks = new KeyedMutex();

  constructor(options: JobServiceOptions) {
    this.#store = options.store;
    this.#adapters = options.adapters;
    this.#log = options.logger;
    this.#maxAmountKobo = options.maxAmountKobo;
    this.#coverDurationDays = options.coverDurationDays;
    this.#onDemoReset = options.onDemoReset;
    this.#now = options.now ?? (() => new Date());
  }

  modes(): Modes {
    return adapterModes(this.#adapters);
  }

  /** Seeds the demo data on an empty database. Returns the seeded job id, or null if data already exists. */
  async ensureSeeded(): Promise<string | null> {
    return (await this.#store.hasUsers()) ? null : (await this.resetDemo()).jobId;
  }

  /** Wipes everything and restores exactly the seed: Tunde, Emeka, and the "Brake repair" job. */
  async resetDemo(): Promise<{ jobId: string }> {
    const job = this.#newJob({
      customerId: SEED_CUSTOMER.id,
      workerId: SEED_WORKER.id,
      title: SEED_JOB.title,
      amountKobo: SEED_JOB.amountKobo,
    });
    await this.#store.reset([SEED_CUSTOMER, SEED_WORKER], job);
    this.#onDemoReset?.();
    this.#log.info("demo reset", { jobId: job.id, store: this.#store.kind });
    return { jobId: job.id };
  }

  async createJob(input: CreateJobInput): Promise<JobView> {
    const title = input.title.trim();
    if (title === "") throw new DomainError("VALIDATION_ERROR", "title must not be empty");
    if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo <= 0) {
      throw new DomainError("VALIDATION_ERROR", "amountKobo must be a positive whole number of kobo");
    }
    if (input.amountKobo > this.#maxAmountKobo) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `amountKobo must not exceed ${this.#maxAmountKobo} (${formatNaira(this.#maxAmountKobo)})`,
      );
    }
    const [customer, worker] = await Promise.all([
      this.#requireUserWithRole(input.customerId, "customer", "customerId"),
      this.#requireUserWithRole(input.workerId, "worker", "workerId"),
    ]);

    const job = this.#newJob({ ...input, title });
    await this.#store.insertJob(job);
    this.#log.info("transition", { jobId: job.id, action: "book", from: null, to: "BOOKED" });
    return toJobView(job, customer, worker);
  }

  async getJob(jobId: string): Promise<JobView> {
    return this.#view(await this.#requireJob(jobId));
  }

  /** BOOKED → BOOKED. Re-quoting replaces the previous quote. */
  async quote(jobId: string): Promise<QuoteView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      nextStatus(job.status, "quote");
      const worker = await this.#requireUser(job.workerId);

      const quote = await this.#callAdapter(job, "insurance", "quote", (insurance) =>
        insurance.quote({
          valueKobo: job.amountKobo,
          durationDays: this.#coverDurationDays,
          category: worker.trade ?? "general",
        }),
      );

      await this.#transition(job, "quote", {
        set: { quoteId: quote.quoteId, premiumKobo: quote.premiumKobo },
        events: [{ type: "quote.issued", detail: `Cover quoted at ${formatNaira(quote.premiumKobo)} (${quote.quoteId})` }],
        usedAdapter: "insurance",
      });

      return {
        quoteId: quote.quoteId,
        premiumKobo: quote.premiumKobo,
        totalKobo: job.amountKobo + quote.premiumKobo,
        coverage: quote.coverage,
      };
    });
  }

  /**
   * BOOKED → ESCROWED → INSURED in one request. Safe to retry: on an ESCROWED job only the
   * policy step runs again (never a second charge), and a replay on INSURED is a no-op.
   */
  async pay(jobId: string, quoteId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      let job = await this.#requireJob(jobId);

      if (job.status === "INSURED" && job.quoteId === quoteId) return this.#view(job);
      if (job.status !== "BOOKED" && job.status !== "ESCROWED") {
        throw new DomainError("INVALID_TRANSITION", `cannot pay for a job that is ${job.status}`);
      }
      const premiumKobo = requireMatchingQuote(job, quoteId);

      if (job.status === "BOOKED") {
        const totalKobo = job.amountKobo + premiumKobo;
        const { escrowRef } = await this.#callAdapter(job, "payment", "collect", (payment) =>
          payment.collect({ jobId, amountKobo: totalKobo }),
        );
        job = await this.#transition(job, "collect", {
          set: { escrowRef },
          events: [{ type: "payment.escrowed", detail: `${formatNaira(totalKobo)} held in escrow (${escrowRef})` }],
          usedAdapter: "payment",
        });
      }

      const escrowed = job;
      const { policyRef } = await this.#callAdapter(escrowed, "insurance", "issue", (insurance) =>
        insurance.issue({ quoteId, jobId }),
      );
      job = await this.#transition(escrowed, "issuePolicy", {
        set: { policyRef },
        events: [{ type: "policy.issued", detail: `Job insured under policy ${policyRef}` }],
        usedAdapter: "insurance",
      });

      return this.#view(job);
    });
  }

  /**
   * Records one party's confirmation. The second confirmation moves INSURED → CONFIRMED and
   * immediately pays out (→ PAID_OUT). Repeat confirmations are no-ops. If the payout call
   * fails the job stays CONFIRMED, and any further confirm retries the payout.
   */
  async confirm(jobId: string, party: Party): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      let job = await this.#requireJob(jobId);

      switch (job.status) {
        case "PAID_OUT":
          return this.#view(job);
        case "INSURED": {
          const self = isConfirmedBy(job, party);
          const other = isConfirmedBy(job, party === "customer" ? "worker" : "customer");
          if (self && !other) return this.#view(job);

          const recorded: EventInput = { type: "confirmation.recorded", detail: `${capitalize(party)} confirmed the job is done` };
          const confirmedAt: JobPatch = party === "customer" ? { customerConfirmedAt: this.#timestamp() } : { workerConfirmedAt: this.#timestamp() };

          if (!other) {
            // First confirmation: recorded, no status change.
            const updated = await this.#store.updateJob(job.id, {
              expectStatus: "INSURED",
              set: confirmedAt,
              events: [this.#event(recorded)],
            });
            if (!updated) throw await this.#staleJob(job.id);
            this.#log.info("confirmation", { jobId, party });
            return this.#view(updated);
          }

          // Second confirmation: record it and move to CONFIRMED in one write.
          job = await this.#transition(job, "confirm", {
            set: self ? {} : confirmedAt,
            events: [...(self ? [] : [recorded]), { type: "job.confirmed", detail: "Both parties confirmed; releasing payout" }],
          });
          break;
        }
        case "CONFIRMED":
          break; // an earlier payout attempt failed; retry it
        default:
          throw new DomainError("INVALID_TRANSITION", `cannot confirm a job that is ${job.status}`);
      }

      return this.#view(await this.#payOut(job));
    });
  }

  /** INSURED or CONFIRMED → CLAIM_FILED. Payout is held from then on. */
  async fileClaim(jobId: string, input: FileClaimInput): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      nextStatus(job.status, "claim");
      const policyRef = job.policyRef;
      if (policyRef === null) throw new Error(`job ${jobId} is ${job.status} but has no policyRef`);

      const claim = await this.#callAdapter(job, "insurance", "fileClaim", (insurance) =>
        insurance.fileClaim({ policyRef, reason: input.reason, details: input.details }),
      );

      const updated = await this.#transition(job, "claim", {
        events: [
          {
            type: "claim.filed",
            detail: `${capitalize(input.filedBy)} filed a ${CLAIM_REASON_LABELS[input.reason]} claim (${claim.claimRef}); payout is on hold`,
          },
        ],
        usedAdapter: "insurance",
        claim: {
          id: newId("clm"),
          filedBy: input.filedBy,
          reason: input.reason,
          details: input.details,
          ref: claim.claimRef,
          status: claim.status,
          createdAt: this.#timestamp(),
        },
      });
      return this.#view(updated);
    });
  }

  // ---------------------------------------------------------------------------

  #newJob(input: CreateJobInput): JobRecord {
    const createdAt = this.#timestamp();
    return {
      id: newId("job"),
      customerId: input.customerId,
      workerId: input.workerId,
      title: input.title,
      amountKobo: input.amountKobo,
      premiumKobo: null,
      status: "BOOKED",
      quoteId: null,
      escrowRef: null,
      policyRef: null,
      payoutCode: null,
      payoutRef: null,
      payoutExpiresAt: null,
      customerConfirmedAt: null,
      workerConfirmedAt: null,
      modes: this.modes(),
      createdAt,
      claim: null,
      events: [{ type: "job.booked", at: createdAt, detail: `${input.title} booked for ${formatNaira(input.amountKobo)}` }],
    };
  }

  /** CONFIRMED → PAID_OUT. A token is only ever issued once: the write is conditional on CONFIRMED. */
  async #payOut(job: JobRecord): Promise<JobRecord> {
    if (job.payoutRef !== null) throw new Error(`job ${job.id} is CONFIRMED but already has payout ${job.payoutRef}`);
    const worker = await this.#requireUser(job.workerId);

    const token = await this.#callAdapter(job, "payout", "issueToken", (payout) =>
      payout.issueToken({ jobId: job.id, amountKobo: job.amountKobo, phone: worker.phone }),
    );

    return this.#transition(job, "payout", {
      set: { payoutCode: token.code, payoutRef: token.ref, payoutExpiresAt: token.expiresAt },
      // The code itself stays out of the timeline: only the worker view shows it.
      events: [{ type: "payout.issued", detail: `${formatNaira(job.amountKobo)} cash-out token issued to ${worker.name} (${token.ref})` }],
      usedAdapter: "payout",
    });
  }

  /** Applies one transition atomically, conditional on the job still being in the status it was read in. */
  async #transition(job: JobRecord, action: JobAction, options: TransitionOptions): Promise<JobRecord> {
    const to = nextStatus(job.status, action);
    const set: JobPatch = { ...options.set, status: to };
    if (options.usedAdapter) set.modes = { ...job.modes, [options.usedAdapter]: this.#adapters[options.usedAdapter].mode };

    const updated = await this.#store.updateJob(job.id, {
      expectStatus: job.status,
      set,
      events: options.events.map((e) => this.#event(e)),
      ...(options.claim && { claim: options.claim }),
    });
    if (!updated) throw await this.#staleJob(job.id);
    this.#log.info("transition", { jobId: job.id, action, from: job.status, to });
    return updated;
  }

  /** Logs every adapter call with its mode; on failure records a timeline event and surfaces ADAPTER_ERROR. */
  async #callAdapter<K extends AdapterName, T>(
    job: JobRecord,
    name: K,
    operation: string,
    call: (adapter: Adapters[K]) => Promise<T>,
  ): Promise<T> {
    const adapter = this.#adapters[name];
    const started = performance.now();
    const fields = { jobId: job.id, adapter: name, operation, mode: adapter.mode };
    try {
      const result = await call(adapter);
      this.#log.info("adapter call", { ...fields, outcome: "ok", ms: Math.round(performance.now() - started) });
      return result;
    } catch (err) {
      const message = errorMessage(err);
      this.#log.warn("adapter call", { ...fields, outcome: "error", ms: Math.round(performance.now() - started), error: message });
      await this.#recordFailure(job.id, `${name}.${operation}.failed`, `${operation} failed (${adapter.mode}): ${message}`);
      throw new DomainError("ADAPTER_ERROR", `${name} ${operation} failed (${adapter.mode}): ${message}`, { cause: err });
    }
  }

  async #recordFailure(jobId: string, type: string, detail: string): Promise<void> {
    try {
      await this.#store.appendEvents(jobId, [this.#event({ type, detail })]);
    } catch (err) {
      // Never mask the adapter error with a bookkeeping error.
      this.#log.error("failed to record failure event", { jobId, type, error: errorMessage(err) });
    }
  }

  /** Explains a conditional update that matched nothing: the job vanished or moved on. */
  async #staleJob(jobId: string): Promise<DomainError> {
    const current = await this.#store.getJob(jobId);
    return current
      ? new DomainError("INVALID_TRANSITION", `job changed while processing; it is now ${current.status}`)
      : new DomainError("NOT_FOUND", `job ${jobId} not found`);
  }

  async #view(job: JobRecord): Promise<JobView> {
    const [customer, worker] = await Promise.all([this.#requireUser(job.customerId), this.#requireUser(job.workerId)]);
    return toJobView(job, customer, worker);
  }

  async #requireJob(jobId: string): Promise<JobRecord> {
    const job = await this.#store.getJob(jobId);
    if (!job) throw new DomainError("NOT_FOUND", `job ${jobId} not found`);
    return job;
  }

  async #requireUser(userId: string): Promise<UserRecord> {
    const user = await this.#store.getUser(userId);
    if (!user) throw new Error(`user ${userId} referenced by a job does not exist`);
    return user;
  }

  async #requireUserWithRole(userId: string, role: Party, field: string): Promise<UserRecord> {
    const user = await this.#store.getUser(userId);
    if (!user) throw new DomainError("VALIDATION_ERROR", `${field}: user ${userId} does not exist`);
    if (user.role !== role) throw new DomainError("VALIDATION_ERROR", `${field}: user ${userId} is not a ${role}`);
    return user;
  }

  #event(input: EventInput): EventRecord {
    return { type: input.type, at: this.#timestamp(), detail: input.detail };
  }

  #timestamp(): string {
    return this.#now().toISOString();
  }
}

function requireMatchingQuote(job: JobRecord, quoteId: string): number {
  if (job.quoteId === null || job.premiumKobo === null) {
    throw new DomainError("QUOTE_REQUIRED", "request a quote before paying");
  }
  if (job.quoteId !== quoteId) {
    throw new DomainError("QUOTE_MISMATCH", "quoteId does not match the latest quote for this job");
  }
  return job.premiumKobo;
}

function isConfirmedBy(job: JobRecord, party: Party): boolean {
  return (party === "customer" ? job.customerConfirmedAt : job.workerConfirmedAt) !== null;
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
