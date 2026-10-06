import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adapterModes, type Adapters } from "../adapters/index.ts";
import type { AdapterName, Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import { DomainError, errorMessage } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { SEED_CUSTOMER, SEED_JOB, SEED_WORKER } from "../store/seed.ts";
import type { JobPatch, JobRow, Party, Store, UserRow } from "../store/store.ts";
import { KeyedMutex } from "./keyedMutex.ts";
import { nextStatus, type JobAction } from "./stateMachine.ts";
import { formatNaira, parseModes, toJobView, type JobView, type QuoteView } from "./view.ts";

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

const CLAIM_REASON_LABELS: Record<ClaimReason, string> = {
  damage: "property damage",
  injury: "injury",
  not_done: "job not done",
};

/**
 * Owns the job lifecycle. Pattern for every operation:
 *   1. take the per-job lock (so retries and double-clicks cannot double-charge),
 *   2. check the transition is allowed before calling out,
 *   3. call the adapter outside any DB transaction,
 *   4. apply the transition + event row in one DB transaction, re-checking the state.
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

  /** Seeds the demo data on a fresh database. Returns the seeded job id, or null if data already exists. */
  ensureSeeded(): string | null {
    return this.#store.countUsers() > 0 ? null : this.resetDemo().jobId;
  }

  /** Wipes everything and restores exactly the seed: Tunde, Emeka, and the "Brake repair" job. */
  resetDemo(): { jobId: string } {
    const jobId = this.#store.transaction(() => {
      this.#store.wipe();
      this.#store.insertUser(SEED_CUSTOMER);
      this.#store.insertUser(SEED_WORKER);
      return this.#insertJob({
        customerId: SEED_CUSTOMER.id,
        workerId: SEED_WORKER.id,
        title: SEED_JOB.title,
        amountKobo: SEED_JOB.amountKobo,
      });
    });
    this.#onDemoReset?.();
    this.#log.info("demo reset", { jobId });
    return { jobId };
  }

  createJob(input: CreateJobInput): JobView {
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

    const jobId = this.#store.transaction(() => {
      this.#requireUserWithRole(input.customerId, "customer", "customerId");
      this.#requireUserWithRole(input.workerId, "worker", "workerId");
      return this.#insertJob({ ...input, title });
    });
    return this.getJob(jobId);
  }

  getJob(jobId: string): JobView {
    const job = this.#requireJob(jobId);
    return toJobView(
      job,
      this.#requireUser(job.customer_id),
      this.#requireUser(job.worker_id),
      this.#store.getClaim(job.id),
      this.#store.listEvents(job.id),
    );
  }

  /** BOOKED → BOOKED. Re-quoting replaces the previous quote. */
  async quote(jobId: string): Promise<QuoteView> {
    return this.#locks.run(jobId, async () => {
      const job = this.#requireJob(jobId);
      nextStatus(job.status, "quote");
      const worker = this.#requireUser(job.worker_id);

      const quote = await this.#callAdapter(job, "insurance", "quote", (insurance) =>
        insurance.quote({
          valueKobo: job.amount_kobo,
          durationDays: this.#coverDurationDays,
          category: worker.trade ?? "general",
        }),
      );

      this.#transition(
        jobId,
        "quote",
        { quote_id: quote.quoteId, premium_kobo: quote.premiumKobo },
        { type: "quote.issued", detail: `Cover quoted at ${formatNaira(quote.premiumKobo)} (${quote.quoteId})` },
        "insurance",
      );

      return {
        quoteId: quote.quoteId,
        premiumKobo: quote.premiumKobo,
        totalKobo: job.amount_kobo + quote.premiumKobo,
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
      let job = this.#requireJob(jobId);

      if (job.status === "INSURED" && job.quote_id === quoteId) return this.getJob(jobId);
      if (job.status !== "BOOKED" && job.status !== "ESCROWED") {
        throw new DomainError("INVALID_TRANSITION", `cannot pay for a job that is ${job.status}`);
      }
      const premiumKobo = this.#requireMatchingQuote(job, quoteId);

      if (job.status === "BOOKED") {
        const totalKobo = job.amount_kobo + premiumKobo;
        const { escrowRef } = await this.#callAdapter(job, "payment", "collect", (payment) =>
          payment.collect({ jobId, amountKobo: totalKobo }),
        );
        job = this.#transition(
          jobId,
          "collect",
          { escrow_ref: escrowRef },
          { type: "payment.escrowed", detail: `${formatNaira(totalKobo)} held in escrow (${escrowRef})` },
          "payment",
        );
      }

      const { policyRef } = await this.#callAdapter(job, "insurance", "issue", (insurance) =>
        insurance.issue({ quoteId, jobId }),
      );
      this.#transition(
        jobId,
        "issuePolicy",
        { policy_ref: policyRef },
        { type: "policy.issued", detail: `Job insured under policy ${policyRef}` },
        "insurance",
      );

      return this.getJob(jobId);
    });
  }

  /**
   * Records one party's confirmation. The second confirmation moves INSURED → CONFIRMED and
   * immediately pays out (→ PAID_OUT). Repeat confirmations are no-ops. If the payout call
   * fails the job stays CONFIRMED, and any further confirm retries the payout.
   */
  async confirm(jobId: string, party: Party): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      let job = this.#requireJob(jobId);

      switch (job.status) {
        case "PAID_OUT":
          return this.getJob(jobId);
        case "INSURED":
          if (isConfirmedBy(job, party)) return this.getJob(jobId);
          job = this.#recordConfirmation(jobId, party);
          if (job.status !== "CONFIRMED") return this.getJob(jobId);
          break;
        case "CONFIRMED":
          break;
        default:
          throw new DomainError("INVALID_TRANSITION", `cannot confirm a job that is ${job.status}`);
      }

      await this.#payOut(job);
      return this.getJob(jobId);
    });
  }

  /** INSURED or CONFIRMED → CLAIM_FILED. Payout is held from then on. */
  async fileClaim(jobId: string, input: FileClaimInput): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = this.#requireJob(jobId);
      nextStatus(job.status, "claim");
      const policyRef = job.policy_ref;
      if (policyRef === null) throw new Error(`job ${jobId} is ${job.status} but has no policy_ref`);

      const claim = await this.#callAdapter(job, "insurance", "fileClaim", (insurance) =>
        insurance.fileClaim({ policyRef, reason: input.reason, details: input.details }),
      );

      this.#store.transaction(() => {
        const current = this.#requireJob(jobId);
        this.#applyTransition(
          current,
          "claim",
          {},
          {
            type: "claim.filed",
            detail: `${capitalize(input.filedBy)} filed a ${CLAIM_REASON_LABELS[input.reason]} claim (${claim.claimRef}); payout is on hold`,
          },
          "insurance",
        );
        this.#store.insertClaim({
          id: newId("clm"),
          job_id: jobId,
          filed_by: input.filedBy,
          reason: input.reason,
          details: input.details,
          ref: claim.claimRef,
          status: claim.status,
          created_at: this.#timestamp(),
        });
      });

      return this.getJob(jobId);
    });
  }

  // ---------------------------------------------------------------------------

  #insertJob(input: CreateJobInput): string {
    const id = newId("job");
    const createdAt = this.#timestamp();
    this.#store.insertJob({
      id,
      customer_id: input.customerId,
      worker_id: input.workerId,
      title: input.title,
      amount_kobo: input.amountKobo,
      status: "BOOKED",
      modes_json: JSON.stringify(this.modes()),
      created_at: createdAt,
    });
    this.#store.insertEvent({
      job_id: id,
      type: "job.booked",
      detail: `${input.title} booked for ${formatNaira(input.amountKobo)}`,
      created_at: createdAt,
    });
    this.#log.info("transition", { jobId: id, action: "book", from: null, to: "BOOKED" });
    return id;
  }

  #recordConfirmation(jobId: string, party: Party): JobRow {
    return this.#store.transaction(() => {
      const job = this.#requireJob(jobId);
      if (job.status !== "INSURED") {
        throw new DomainError("INVALID_TRANSITION", `cannot confirm a job that is ${job.status}`);
      }
      const at = this.#timestamp();
      this.#store.updateJob(jobId, party === "customer" ? { customer_confirmed_at: at } : { worker_confirmed_at: at });
      this.#store.insertEvent({
        job_id: jobId,
        type: "confirmation.recorded",
        detail: `${capitalize(party)} confirmed the job is done`,
        created_at: at,
      });
      this.#log.info("confirmation", { jobId, party });

      const updated = this.#requireJob(jobId);
      if (updated.customer_confirmed_at === null || updated.worker_confirmed_at === null) return updated;
      return this.#applyTransition(updated, "confirm", {}, {
        type: "job.confirmed",
        detail: "Both parties confirmed; releasing payout",
      });
    });
  }

  /** CONFIRMED → PAID_OUT. Guarded on payout_ref so a token is only ever issued once. */
  async #payOut(job: JobRow): Promise<void> {
    if (job.payout_ref !== null) throw new Error(`job ${job.id} is CONFIRMED but already has payout ${job.payout_ref}`);
    const worker = this.#requireUser(job.worker_id);

    const token = await this.#callAdapter(job, "payout", "issueToken", (payout) =>
      payout.issueToken({ jobId: job.id, amountKobo: job.amount_kobo, phone: worker.phone }),
    );

    this.#store.transaction(() => {
      const current = this.#requireJob(job.id);
      if (current.payout_ref !== null) throw new Error(`job ${job.id} was paid out concurrently`);
      this.#applyTransition(
        current,
        "payout",
        { payout_code: token.code, payout_ref: token.ref, payout_expires_at: token.expiresAt },
        // The code itself stays out of the timeline: only the worker view shows it.
        { type: "payout.issued", detail: `${formatNaira(job.amount_kobo)} cash-out token issued to ${worker.name} (${token.ref})` },
        "payout",
      );
    });
  }

  /** Runs one transition in its own DB transaction. */
  #transition(jobId: string, action: JobAction, patch: JobPatch, event: EventInput, usedAdapter?: AdapterName): JobRow {
    return this.#store.transaction(() => this.#applyTransition(this.#requireJob(jobId), action, patch, event, usedAdapter));
  }

  /** Must run inside a DB transaction. Re-validates the state, writes the patch and the event row. */
  #applyTransition(
    job: JobRow,
    action: JobAction,
    patch: JobPatch,
    event: EventInput,
    usedAdapter?: AdapterName,
  ): JobRow {
    const to = nextStatus(job.status, action);
    const modesPatch: JobPatch = usedAdapter
      ? { modes_json: JSON.stringify({ ...parseModes(job.modes_json), [usedAdapter]: this.#adapters[usedAdapter].mode }) }
      : {};
    this.#store.updateJob(job.id, { ...patch, ...modesPatch, status: to });
    this.#store.insertEvent({ job_id: job.id, type: event.type, detail: event.detail, created_at: this.#timestamp() });
    this.#log.info("transition", { jobId: job.id, action, from: job.status, to });
    return this.#requireJob(job.id);
  }

  /** Logs every adapter call with its mode; on failure records a timeline event and surfaces ADAPTER_ERROR. */
  async #callAdapter<K extends AdapterName, T>(
    job: JobRow,
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
      this.#recordFailure(job.id, `${name}.${operation}.failed`, `${operation} failed (${adapter.mode}): ${message}`);
      throw new DomainError("ADAPTER_ERROR", `${name} ${operation} failed (${adapter.mode}): ${message}`, { cause: err });
    }
  }

  #recordFailure(jobId: string, type: string, detail: string): void {
    try {
      this.#store.transaction(() => {
        if (this.#store.getJob(jobId)) {
          this.#store.insertEvent({ job_id: jobId, type, detail, created_at: this.#timestamp() });
        }
      });
    } catch (err) {
      // Never mask the adapter error with a bookkeeping error.
      this.#log.error("failed to record failure event", { jobId, type, error: errorMessage(err) });
    }
  }

  #requireMatchingQuote(job: JobRow, quoteId: string): number {
    if (job.quote_id === null || job.premium_kobo === null) {
      throw new DomainError("QUOTE_REQUIRED", "request a quote before paying");
    }
    if (job.quote_id !== quoteId) {
      throw new DomainError("QUOTE_MISMATCH", "quoteId does not match the latest quote for this job");
    }
    return job.premium_kobo;
  }

  #requireJob(jobId: string): JobRow {
    const job = this.#store.getJob(jobId);
    if (!job) throw new DomainError("NOT_FOUND", `job ${jobId} not found`);
    return job;
  }

  #requireUser(userId: string): UserRow {
    const user = this.#store.getUser(userId);
    if (!user) throw new Error(`user ${userId} referenced by a job does not exist`);
    return user;
  }

  #requireUserWithRole(userId: string, role: Party, field: string): UserRow {
    const user = this.#store.getUser(userId);
    if (!user) throw new DomainError("VALIDATION_ERROR", `${field}: user ${userId} does not exist`);
    if (user.role !== role) throw new DomainError("VALIDATION_ERROR", `${field}: user ${userId} is not a ${role}`);
    return user;
  }

  #timestamp(): string {
    return this.#now().toISOString();
  }
}

function isConfirmedBy(job: JobRow, party: Party): boolean {
  return (party === "customer" ? job.customer_confirmed_at : job.worker_confirmed_at) !== null;
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
