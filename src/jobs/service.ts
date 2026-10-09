import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { adapterModes, type Adapters } from "../adapters/index.ts";
import type { AdapterName, Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import { DomainError, errorMessage } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { hashPassword } from "../auth/passwords.ts";
import { SEED_CUSTOMER, SEED_JOB, SEED_PASSWORD, SEED_WORKER } from "../store/seed.ts";
import type { ClaimRecord, EventRecord, JobPatch, JobRecord, Party, Store, UserRecord } from "../store/types.ts";
import { serviceFeeKobo, type FeePolicy } from "./fees.ts";
import { KeyedMutex } from "./keyedMutex.ts";
import { nextStatus, type JobAction } from "./stateMachine.ts";
import { formatNaira, isOnPlatform, toJobView, type JobView, type QuoteView } from "./view.ts";

export interface JobServiceOptions {
  store: Store;
  adapters: Adapters;
  logger: Logger;
  maxAmountKobo: number;
  coverDurationDays: number;
  fee: FeePolicy;
  /** Runs after a demo reset, e.g. to re-arm MOCK_FAIL. */
  onDemoReset?: () => void;
  now?: () => Date;
}

/** A worker the customer adds at booking time because they have no SureJob account. */
export interface NewWorkerInput {
  name: string;
  phone: string;
  trade?: string | undefined;
}

export interface CreateJobInput {
  title: string;
  amountKobo: number;
  /** Exactly one of workerId (a registered worker) or newWorker. */
  workerId?: string | undefined;
  newWorker?: NewWorkerInput | undefined;
}

export interface FileClaimInput {
  reason: ClaimReason;
  details: string;
}

interface JobDraft {
  customerId: string;
  workerId: string;
  title: string;
  amountKobo: number;
}

export interface WorkerSummary {
  id: string;
  name: string;
  trade: string | null;
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
  readonly #fee: FeePolicy;
  readonly #onDemoReset: (() => void) | undefined;
  readonly #now: () => Date;
  readonly #locks = new KeyedMutex();

  constructor(options: JobServiceOptions) {
    this.#store = options.store;
    this.#adapters = options.adapters;
    this.#log = options.logger;
    this.#maxAmountKobo = options.maxAmountKobo;
    this.#coverDurationDays = options.coverDurationDays;
    this.#fee = options.fee;
    this.#onDemoReset = options.onDemoReset;
    this.#now = options.now ?? (() => new Date());
  }

  modes(): Modes {
    return adapterModes(this.#adapters);
  }

  /**
   * Seeds the demo data when the demo customer account is missing: an empty database, or one
   * seeded before accounts existed. Returns the seeded job id, or null if nothing was needed.
   */
  async ensureSeeded(): Promise<string | null> {
    const seeded = await this.#store.getUserByEmail(SEED_CUSTOMER.email!);
    return seeded?.passwordHash ? null : (await this.resetDemo()).jobId;
  }

  /**
   * Wipes everything and restores exactly the seed: Tunde and Emeka (both log in with SEED_PASSWORD)
   * and the "Brake repair" job.
   */
  async resetDemo(): Promise<{ jobId: string }> {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const job = this.#newJob({
      customerId: SEED_CUSTOMER.id,
      workerId: SEED_WORKER.id,
      title: SEED_JOB.title,
      amountKobo: SEED_JOB.amountKobo,
    });
    await this.#store.reset([{ ...SEED_CUSTOMER, passwordHash }, { ...SEED_WORKER, passwordHash }], job);
    this.#onDemoReset?.();
    this.#log.info("demo reset", { jobId: job.id, store: this.#store.kind });
    return { jobId: job.id };
  }

  /** Registered workers a customer can book. */
  async listWorkers(): Promise<WorkerSummary[]> {
    return (await this.#store.listWorkers()).map((w) => ({ id: w.id, name: w.name, trade: w.trade }));
  }

  /** The actor's jobs (as customer or worker), newest first. */
  async listJobs(actor: UserRecord): Promise<JobView[]> {
    const jobs = await this.#store.listJobsForUser(actor.id);
    const users = new Map<string, Promise<UserRecord>>();
    const user = (id: string) => {
      if (!users.has(id)) users.set(id, this.#requireUser(id));
      return users.get(id)!;
    };
    return Promise.all(
      jobs.map(async (job) => toJobView(job, await user(job.customerId), await user(job.workerId), sideOf(job, actor))),
    );
  }

  /**
   * Books a job for the logged-in customer, with either a registered worker or a new worker the
   * customer adds (no account; they are paid by cash token on their phone).
   */
  async createJob(actor: UserRecord, input: CreateJobInput): Promise<JobView> {
    if (actor.role !== "customer") throw new DomainError("FORBIDDEN", "only customers can book jobs");
    if ((input.workerId === undefined) === (input.newWorker === undefined)) {
      throw new DomainError("VALIDATION_ERROR", "give exactly one of workerId or newWorker");
    }
    const title = input.title.trim();
    if (title === "") throw new DomainError("VALIDATION_ERROR", "title must not be empty");
    this.#validateAmount(input.amountKobo);
    let worker: UserRecord;
    if (input.newWorker) {
      worker = {
        id: newId("usr"),
        name: input.newWorker.name.trim(),
        role: "worker",
        phone: input.newWorker.phone,
        trade: input.newWorker.trade?.trim() || null,
        email: null,
        passwordHash: null,
      };
      await this.#store.insertUser(worker);
      this.#log.info("off-platform worker added", { workerId: worker.id, by: actor.id });
    } else {
      worker = await this.#requireUserWithRole(input.workerId!, "worker", "workerId");
    }

    const job = this.#newJob({ customerId: actor.id, workerId: worker.id, title, amountKobo: input.amountKobo });
    if (!isOnPlatform(worker)) {
      job.events.push({
        type: "worker.added",
        at: job.createdAt,
        detail: `${worker.name} is not on SureJob; added by ${actor.name}. Payout goes to their phone.`,
      });
    }
    await this.#store.insertJob(job);
    this.#log.info("transition", { jobId: job.id, action: "book", from: null, to: "BOOKED" });
    return toJobView(job, actor, worker, "customer");
  }

  async getJob(actor: UserRecord, jobId: string): Promise<JobView> {
    const job = await this.#requireJob(jobId);
    return this.#view(job, sideOf(job, actor));
  }

  /** BOOKED → BOOKED. Re-quoting replaces the previous quote. */
  async quote(actor: UserRecord, jobId: string): Promise<QuoteView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      requireCustomerOf(job, actor);
      nextStatus(job.status, "quote");
      requireNoPendingOffer(job);
      const worker = await this.#requireUser(job.workerId);
      requirePriceAgreed(job, worker);

      const quote = await this.#callAdapter(job, "insurance", "quote", (insurance) =>
        insurance.quote({
          valueKobo: job.amountKobo,
          durationDays: this.#coverDurationDays,
          category: worker.trade ?? "general",
        }),
      );

      const feeKobo = serviceFeeKobo(job.amountKobo, this.#fee);
      await this.#transition(job, "quote", {
        set: { quoteId: quote.quoteId, premiumKobo: quote.premiumKobo, feeKobo },
        events: [
          {
            type: "quote.issued",
            detail: `Cover quoted at ${formatNaira(quote.premiumKobo)} (${quote.quoteId}); SureJob fee ${formatNaira(feeKobo)}`,
          },
        ],
        usedAdapter: "insurance",
      });

      return {
        quoteId: quote.quoteId,
        premiumKobo: quote.premiumKobo,
        feeKobo,
        totalKobo: job.amountKobo + quote.premiumKobo + feeKobo,
        coverage: quote.coverage,
      };
    });
  }

  /**
   * BOOKED → ESCROWED → INSURED in one request. Safe to retry: on an ESCROWED job only the
   * policy step runs again (never a second charge), and a replay on INSURED is a no-op.
   */
  async pay(actor: UserRecord, jobId: string, quoteId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      let job = await this.#requireJob(jobId);
      requireCustomerOf(job, actor);

      if (job.status === "INSURED" && job.quoteId === quoteId) return this.#view(job, "customer");
      if (job.status !== "BOOKED" && job.status !== "ESCROWED") {
        throw new DomainError("INVALID_TRANSITION", `cannot pay for a job that is ${job.status}`);
      }
      requireNoPendingOffer(job);
      requirePriceAgreed(job, await this.#requireUser(job.workerId));
      const premiumKobo = requireMatchingQuote(job, quoteId);

      if (job.status === "BOOKED") {
        const feeKobo = job.feeKobo ?? 0;
        const totalKobo = job.amountKobo + premiumKobo + feeKobo;
        const { escrowRef } = await this.#callAdapter(job, "payment", "collect", (payment) =>
          payment.collect({ jobId, amountKobo: totalKobo }),
        );
        job = await this.#transition(job, "collect", {
          set: { escrowRef },
          events: [
            {
              type: "payment.escrowed",
              detail:
                `${formatNaira(totalKobo)} held in escrow (${escrowRef}): job ${formatNaira(job.amountKobo)}, ` +
                `cover ${formatNaira(premiumKobo)}, SureJob fee ${formatNaira(feeKobo)}`,
            },
          ],
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

      return this.#view(job, "customer");
    });
  }

  /**
   * Proposes a new price (or counters the other side's offer) on a BOOKED job with a registered
   * worker. The price only changes when the other side accepts.
   */
  async offerPrice(actor: UserRecord, jobId: string, amountKobo: number): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      const party = sideOf(job, actor);
      await this.#requireNegotiable(job);
      this.#validateAmount(amountKobo);
      if (amountKobo === job.amountKobo) {
        throw new DomainError("VALIDATION_ERROR", `the price is already ${formatNaira(amountKobo)}`);
      }

      const isCounter = job.pendingOffer !== null && job.pendingOffer.by !== party;
      const verb = isCounter ? "countered with" : "proposed";
      const updated = await this.#store.updateJob(job.id, {
        expectStatus: "BOOKED",
        set: { pendingOffer: { by: party, amountKobo, at: this.#timestamp() } },
        events: [
          this.#event({
            type: isCounter ? "price.countered" : "price.offered",
            detail: `${capitalize(party)} ${verb} ${formatNaira(amountKobo)} (was ${formatNaira(job.amountKobo)})`,
          }),
        ],
      });
      if (!updated) throw await this.#staleJob(job.id);
      this.#log.info("price offer", { jobId, by: party, amountKobo });
      return this.#view(updated, party);
    });
  }

  /** The side that did not make the open offer accepts it; it becomes the job's price. */
  async acceptOffer(actor: UserRecord, jobId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      const party = sideOf(job, actor);
      await this.#requireNegotiable(job);
      const offer = job.pendingOffer;
      if (!offer) throw new DomainError("INVALID_TRANSITION", "there is no price offer to accept");
      if (offer.by === party) throw new DomainError("FORBIDDEN", "you can't accept your own offer");

      const updated = await this.#store.updateJob(job.id, {
        expectStatus: "BOOKED",
        // A quote priced the old amount; the customer re-quotes before paying.
        set: {
          amountKobo: offer.amountKobo,
          // Whoever offered agreed to it, and the other side just accepted: the worker has agreed either way.
          agreedAmountKobo: offer.amountKobo,
          pendingOffer: null,
          quoteId: null,
          premiumKobo: null,
          feeKobo: null,
        },
        events: [
          this.#event({
            type: "price.agreed",
            detail: `${capitalize(party)} accepted ${formatNaira(offer.amountKobo)}; the job price is now ${formatNaira(offer.amountKobo)}`,
          }),
        ],
      });
      if (!updated) throw await this.#staleJob(job.id);
      this.#log.info("price agreed", { jobId, amountKobo: offer.amountKobo });
      return this.#view(updated, party);
    });
  }

  /** The worker accepts the job at its current price. Needed before the customer can quote and pay. */
  async agreePrice(actor: UserRecord, jobId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      if (sideOf(job, actor) !== "worker") throw new DomainError("FORBIDDEN", "only the worker accepts the price");
      await this.#requireNegotiable(job);
      if (job.pendingOffer) {
        throw new DomainError("OFFER_PENDING", "there is an open price offer; accept, decline or counter it instead");
      }
      if (job.agreedAmountKobo === job.amountKobo) return this.#view(job, "worker");

      const updated = await this.#store.updateJob(job.id, {
        expectStatus: "BOOKED",
        set: { agreedAmountKobo: job.amountKobo },
        events: [this.#event({ type: "price.agreed", detail: `Worker accepted the price of ${formatNaira(job.amountKobo)}` })],
      });
      if (!updated) throw await this.#staleJob(job.id);
      this.#log.info("price agreed", { jobId, amountKobo: job.amountKobo });
      return this.#view(updated, "worker");
    });
  }

  /** Declines the other side's offer, or withdraws your own. The price stays as it was. */
  async declineOffer(actor: UserRecord, jobId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      const party = sideOf(job, actor);
      await this.#requireNegotiable(job);
      const offer = job.pendingOffer;
      if (!offer) throw new DomainError("INVALID_TRANSITION", "there is no price offer to decline");

      const withdrawn = offer.by === party;
      const updated = await this.#store.updateJob(job.id, {
        expectStatus: "BOOKED",
        set: { pendingOffer: null },
        events: [
          this.#event({
            type: withdrawn ? "price.withdrawn" : "price.declined",
            detail: `${capitalize(party)} ${withdrawn ? "withdrew" : "declined"} the ${formatNaira(offer.amountKobo)} offer; the price stays ${formatNaira(job.amountKobo)}`,
          }),
        ],
      });
      if (!updated) throw await this.#staleJob(job.id);
      return this.#view(updated, party);
    });
  }

  /**
   * Records the actor's confirmation. Normally the second confirmation moves INSURED → CONFIRMED and
   * immediately pays out (→ PAID_OUT). When the worker is not on the platform (no account, so they
   * cannot confirm), the customer's confirmation alone does it. Repeat confirmations are no-ops. If
   * the payout call fails the job stays CONFIRMED, and any further confirm retries the payout.
   */
  async confirm(actor: UserRecord, jobId: string): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      let job = await this.#requireJob(jobId);
      const party = sideOf(job, actor);

      switch (job.status) {
        case "PAID_OUT":
          return this.#view(job, party);
        case "INSURED": {
          const worker = await this.#requireUser(job.workerId);
          const workerOnPlatform = isOnPlatform(worker);
          const self = isConfirmedBy(job, party);
          // An off-platform worker cannot confirm, so the customer's word completes the job.
          const complete = workerOnPlatform ? isConfirmedBy(job, party === "customer" ? "worker" : "customer") : true;
          if (self && !complete) return this.#view(job, party);

          const recorded: EventInput = { type: "confirmation.recorded", detail: `${capitalize(party)} confirmed the job is done` };
          const confirmedAt: JobPatch =
            party === "customer" ? { customerConfirmedAt: this.#timestamp() } : { workerConfirmedAt: this.#timestamp() };

          if (!complete) {
            // First of two confirmations: recorded, no status change.
            const updated = await this.#store.updateJob(job.id, {
              expectStatus: "INSURED",
              set: confirmedAt,
              events: [this.#event(recorded)],
            });
            if (!updated) throw await this.#staleJob(job.id);
            this.#log.info("confirmation", { jobId, party });
            return this.#view(updated, party);
          }

          // Final confirmation: record it and move to CONFIRMED in one write.
          const confirmedDetail = workerOnPlatform
            ? "Both parties confirmed; releasing payout"
            : `Customer confirmed; ${worker.name} is not on SureJob, so this releases the payout`;
          job = await this.#transition(job, "confirm", {
            set: self ? {} : confirmedAt,
            events: [...(self ? [] : [recorded]), { type: "job.confirmed", detail: confirmedDetail }],
          });
          break;
        }
        case "CONFIRMED":
          break; // an earlier payout attempt failed; retry it
        default:
          throw new DomainError("INVALID_TRANSITION", `cannot confirm a job that is ${job.status}`);
      }

      return this.#view(await this.#payOut(job), party);
    });
  }

  /** INSURED or CONFIRMED → CLAIM_FILED. Payout is held from then on. */
  async fileClaim(actor: UserRecord, jobId: string, input: FileClaimInput): Promise<JobView> {
    return this.#locks.run(jobId, async () => {
      const job = await this.#requireJob(jobId);
      const filedBy = sideOf(job, actor);
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
            detail: `${capitalize(filedBy)} filed a ${CLAIM_REASON_LABELS[input.reason]} claim (${claim.claimRef}); payout is on hold`,
          },
        ],
        usedAdapter: "insurance",
        claim: {
          id: newId("clm"),
          filedBy,
          reason: input.reason,
          details: input.details,
          ref: claim.claimRef,
          status: claim.status,
          createdAt: this.#timestamp(),
        },
      });
      return this.#view(updated, filedBy);
    });
  }

  // ---------------------------------------------------------------------------

  #newJob(input: JobDraft): JobRecord {
    const createdAt = this.#timestamp();
    return {
      id: newId("job"),
      customerId: input.customerId,
      workerId: input.workerId,
      title: input.title,
      amountKobo: input.amountKobo,
      premiumKobo: null,
      feeKobo: null,
      agreedAmountKobo: null,
      status: "BOOKED",
      quoteId: null,
      escrowRef: null,
      policyRef: null,
      payoutCode: null,
      payoutRef: null,
      payoutExpiresAt: null,
      customerConfirmedAt: null,
      workerConfirmedAt: null,
      pendingOffer: null,
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

  async #view(job: JobRecord, viewer: Party): Promise<JobView> {
    const [customer, worker] = await Promise.all([this.#requireUser(job.customerId), this.#requireUser(job.workerId)]);
    return toJobView(job, customer, worker, viewer);
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

  /** Prices can be negotiated before payment, and only with a worker who has an account. */
  async #requireNegotiable(job: JobRecord): Promise<void> {
    if (job.status !== "BOOKED") {
      throw new DomainError("INVALID_TRANSITION", `the price can only be negotiated before payment; the job is ${job.status}`);
    }
    if (!isOnPlatform(await this.#requireUser(job.workerId))) {
      throw new DomainError("FORBIDDEN", "price negotiation needs a worker with a SureJob account");
    }
  }

  #validateAmount(amountKobo: number): void {
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
      throw new DomainError("VALIDATION_ERROR", "amountKobo must be a positive whole number of kobo");
    }
    if (amountKobo > this.#maxAmountKobo) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `amountKobo must not exceed ${this.#maxAmountKobo} (${formatNaira(this.#maxAmountKobo)})`,
      );
    }
  }

  #event(input: EventInput): EventRecord {
    return { type: input.type, at: this.#timestamp(), detail: input.detail };
  }

  #timestamp(): string {
    return this.#now().toISOString();
  }
}

/** A registered worker must agree to the current price before the customer can quote or pay. */
function requirePriceAgreed(job: JobRecord, worker: UserRecord): void {
  if (isOnPlatform(worker) && job.agreedAmountKobo !== job.amountKobo) {
    throw new DomainError(
      "PRICE_NOT_AGREED",
      `waiting for ${worker.name} to accept the price of ${formatNaira(job.amountKobo)}`,
    );
  }
}

function requireNoPendingOffer(job: JobRecord): void {
  if (job.pendingOffer) {
    const who = job.pendingOffer.by === "worker" ? "The worker" : "The customer";
    throw new DomainError(
      "OFFER_PENDING",
      `${who} proposed ${formatNaira(job.pendingOffer.amountKobo)}; accept or decline it before paying`,
    );
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

/** Which side of the job the actor is on; FORBIDDEN if they are not part of it. */
function sideOf(job: JobRecord, actor: UserRecord): Party {
  if (actor.id === job.customerId) return "customer";
  if (actor.id === job.workerId) return "worker";
  throw new DomainError("FORBIDDEN", "you are not part of this job");
}

function requireCustomerOf(job: JobRecord, actor: UserRecord): void {
  if (sideOf(job, actor) !== "customer") throw new DomainError("FORBIDDEN", "only the customer can do this");
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
