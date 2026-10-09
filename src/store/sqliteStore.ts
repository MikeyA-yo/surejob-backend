import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite";
import type { Modes } from "../adapters/types.ts";
import { withTransaction } from "./db.ts";
import {
  DuplicateEmailError,
  type ClaimRecord,
  type EventRecord,
  type JobPatch,
  type JobRecord,
  type JobUpdate,
  type Party,
  type PriceOffer,
  type Store,
  type UserRecord,
} from "./types.ts";

interface UserRow {
  id: string;
  name: string;
  role: UserRecord["role"];
  phone: string;
  trade: string | null;
  email: string | null;
  password_hash: string | null;
}

interface JobRow {
  id: string;
  customer_id: string;
  worker_id: string;
  title: string;
  amount_kobo: number;
  premium_kobo: number | null;
  fee_kobo: number | null;
  agreed_amount_kobo: number | null;
  status: JobRecord["status"];
  quote_id: string | null;
  escrow_ref: string | null;
  policy_ref: string | null;
  payout_code: string | null;
  payout_ref: string | null;
  payout_expires_at: string | null;
  customer_confirmed_at: string | null;
  worker_confirmed_at: string | null;
  offer_by: Party | null;
  offer_amount_kobo: number | null;
  offer_at: string | null;
  modes_json: string;
  created_at: string;
}

interface ClaimRow {
  id: string;
  filed_by: ClaimRecord["filedBy"];
  reason: ClaimRecord["reason"];
  details: string;
  ref: string;
  status: string;
  created_at: string;
}

interface EventRow {
  type: string;
  detail: string;
  created_at: string;
}

/** Scalar JobPatch field → jobs column. `modes` and `pendingOffer` are mapped in patchColumns. */
const PATCH_COLUMNS: Record<Exclude<keyof JobPatch, "modes" | "pendingOffer">, string> = {
  amountKobo: "amount_kobo",
  premiumKobo: "premium_kobo",
  feeKobo: "fee_kobo",
  agreedAmountKobo: "agreed_amount_kobo",
  status: "status",
  quoteId: "quote_id",
  escrowRef: "escrow_ref",
  policyRef: "policy_ref",
  payoutCode: "payout_code",
  payoutRef: "payout_ref",
  payoutExpiresAt: "payout_expires_at",
  customerConfirmedAt: "customer_confirmed_at",
  workerConfirmedAt: "worker_confirmed_at",
};

/** Turns a JobPatch into [column, value] pairs for UPDATE. */
function patchColumns(patch: JobPatch): [string, SQLInputValue][] {
  const columns: [string, SQLInputValue][] = [];
  for (const [field, value] of Object.entries(patch) as [keyof JobPatch, unknown][]) {
    if (value === undefined) continue;
    if (field === "modes") {
      columns.push(["modes_json", JSON.stringify(value)]);
    } else if (field === "pendingOffer") {
      const offer = value as PriceOffer | null;
      columns.push(["offer_by", offer?.by ?? null], ["offer_amount_kobo", offer?.amountKobo ?? null], ["offer_at", offer?.at ?? null]);
    } else {
      columns.push([PATCH_COLUMNS[field], value as SQLInputValue]);
    }
  }
  return columns;
}

/**
 * SQLite store (node:sqlite). Used when MONGO_URI is not set: local runs, offline demo, tests.
 * node:sqlite is synchronous, so each method body runs to completion without interleaving.
 */
export class SqliteStore implements Store {
  readonly kind = "sqlite";
  readonly #db: DatabaseSync;
  readonly #stmt: Record<
    | "hasUsers"
    | "getUser"
    | "getUserByEmail"
    | "insertUser"
    | "listWorkers"
    | "listJobIdsForUser"
    | "getJob"
    | "insertJob"
    | "getClaim"
    | "insertClaim"
    | "listEvents"
    | "insertEvent",
    StatementSync
  >;

  constructor(db: DatabaseSync) {
    this.#db = db;
    this.#stmt = {
      hasUsers: db.prepare("SELECT EXISTS (SELECT 1 FROM users) AS present"),
      getUser: db.prepare("SELECT * FROM users WHERE id = ?"),
      getUserByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
      insertUser: db.prepare(`
        INSERT INTO users (id, name, role, phone, trade, email, password_hash)
        VALUES (:id, :name, :role, :phone, :trade, :email, :password_hash)
      `),
      listWorkers: db.prepare("SELECT * FROM users WHERE role = 'worker' AND email IS NOT NULL ORDER BY name"),
      listJobIdsForUser: db.prepare(
        "SELECT id FROM jobs WHERE customer_id = :user OR worker_id = :user ORDER BY created_at DESC, rowid DESC",
      ),
      getJob: db.prepare("SELECT * FROM jobs WHERE id = ?"),
      insertJob: db.prepare(`
        INSERT INTO jobs (id, customer_id, worker_id, title, amount_kobo, premium_kobo, fee_kobo, agreed_amount_kobo, status, quote_id, escrow_ref,
          policy_ref, payout_code, payout_ref, payout_expires_at, customer_confirmed_at, worker_confirmed_at,
          offer_by, offer_amount_kobo, offer_at, modes_json, created_at)
        VALUES (:id, :customer_id, :worker_id, :title, :amount_kobo, :premium_kobo, :fee_kobo, :agreed_amount_kobo, :status, :quote_id, :escrow_ref,
          :policy_ref, :payout_code, :payout_ref, :payout_expires_at, :customer_confirmed_at, :worker_confirmed_at,
          :offer_by, :offer_amount_kobo, :offer_at, :modes_json, :created_at)
      `),
      getClaim: db.prepare("SELECT * FROM claims WHERE job_id = ?"),
      insertClaim: db.prepare(`
        INSERT INTO claims (id, job_id, filed_by, reason, details, ref, status, created_at)
        VALUES (:id, :job_id, :filed_by, :reason, :details, :ref, :status, :created_at)
      `),
      listEvents: db.prepare("SELECT type, detail, created_at FROM events WHERE job_id = ? ORDER BY id"),
      insertEvent: db.prepare(
        "INSERT INTO events (job_id, type, detail, created_at) VALUES (:job_id, :type, :detail, :created_at)",
      ),
    };
  }

  async hasUsers(): Promise<boolean> {
    return Number(this.#stmt.hasUsers.get()?.["present"] ?? 0) === 1;
  }

  async getUser(id: string): Promise<UserRecord | null> {
    return userFromRow(this.#stmt.getUser.get(id) as UserRow | undefined);
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    return userFromRow(this.#stmt.getUserByEmail.get(email) as UserRow | undefined);
  }

  async insertUser(user: UserRecord): Promise<void> {
    this.#insertUser(user);
  }

  async listWorkers(): Promise<UserRecord[]> {
    return (this.#stmt.listWorkers.all() as unknown as UserRow[]).map((row) => userFromRow(row)!);
  }

  async listJobsForUser(userId: string): Promise<JobRecord[]> {
    const rows = this.#stmt.listJobIdsForUser.all({ user: userId }) as unknown as { id: string }[];
    return rows.map((row) => this.#readJob(row.id)!);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    return this.#readJob(id);
  }

  async insertJob(job: JobRecord): Promise<void> {
    withTransaction(this.#db, () => this.#insertJob(job));
  }

  async updateJob(id: string, update: JobUpdate): Promise<JobRecord | null> {
    return withTransaction(this.#db, () => {
      const row = this.#stmt.getJob.get(id) as JobRow | undefined;
      if (!row || row.status !== update.expectStatus) return null;

      const columns = patchColumns(update.set);
      if (columns.length > 0) {
        const assignments = columns.map(([column]) => `${column} = ?`).join(", ");
        this.#db.prepare(`UPDATE jobs SET ${assignments} WHERE id = ?`).run(...columns.map(([, value]) => value), id);
      }
      if (update.claim) this.#insertClaim(id, update.claim);
      this.#insertEvents(id, update.events);
      return this.#readJob(id);
    });
  }

  async appendEvents(id: string, events: EventRecord[]): Promise<void> {
    withTransaction(this.#db, () => {
      if (this.#stmt.getJob.get(id)) this.#insertEvents(id, events);
    });
  }

  async reset(users: UserRecord[], job: JobRecord): Promise<void> {
    withTransaction(this.#db, () => {
      this.#db.exec("DELETE FROM events; DELETE FROM claims; DELETE FROM jobs; DELETE FROM users;");
      for (const user of users) this.#insertUser(user);
      this.#insertJob(job);
    });
  }

  async close(): Promise<void> {
    this.#db.close();
  }

  #insertUser(user: UserRecord): void {
    try {
      this.#stmt.insertUser.run({
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        trade: user.trade,
        email: user.email,
        password_hash: user.passwordHash,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("UNIQUE constraint failed: users.email")) {
        throw new DuplicateEmailError(user.email ?? "");
      }
      throw err;
    }
  }

  #readJob(id: string): JobRecord | null {
    const row = this.#stmt.getJob.get(id) as JobRow | undefined;
    if (!row) return null;
    const claim = this.#stmt.getClaim.get(id) as ClaimRow | undefined;
    const events = this.#stmt.listEvents.all(id) as unknown as EventRow[];
    return {
      id: row.id,
      customerId: row.customer_id,
      workerId: row.worker_id,
      title: row.title,
      amountKobo: row.amount_kobo,
      premiumKobo: row.premium_kobo,
      feeKobo: row.fee_kobo,
      agreedAmountKobo: row.agreed_amount_kobo,
      status: row.status,
      quoteId: row.quote_id,
      escrowRef: row.escrow_ref,
      policyRef: row.policy_ref,
      payoutCode: row.payout_code,
      payoutRef: row.payout_ref,
      payoutExpiresAt: row.payout_expires_at,
      customerConfirmedAt: row.customer_confirmed_at,
      workerConfirmedAt: row.worker_confirmed_at,
      pendingOffer:
        row.offer_by !== null && row.offer_amount_kobo !== null && row.offer_at !== null
          ? { by: row.offer_by, amountKobo: row.offer_amount_kobo, at: row.offer_at }
          : null,
      modes: JSON.parse(row.modes_json) as Modes,
      createdAt: row.created_at,
      claim: claim
        ? {
            id: claim.id,
            filedBy: claim.filed_by,
            reason: claim.reason,
            details: claim.details,
            ref: claim.ref,
            status: claim.status,
            createdAt: claim.created_at,
          }
        : null,
      events: events.map((e) => ({ type: e.type, at: e.created_at, detail: e.detail })),
    };
  }

  #insertJob(job: JobRecord): void {
    this.#stmt.insertJob.run({
      id: job.id,
      customer_id: job.customerId,
      worker_id: job.workerId,
      title: job.title,
      amount_kobo: job.amountKobo,
      premium_kobo: job.premiumKobo,
      fee_kobo: job.feeKobo,
      agreed_amount_kobo: job.agreedAmountKobo,
      status: job.status,
      quote_id: job.quoteId,
      escrow_ref: job.escrowRef,
      policy_ref: job.policyRef,
      payout_code: job.payoutCode,
      payout_ref: job.payoutRef,
      payout_expires_at: job.payoutExpiresAt,
      customer_confirmed_at: job.customerConfirmedAt,
      worker_confirmed_at: job.workerConfirmedAt,
      offer_by: job.pendingOffer?.by ?? null,
      offer_amount_kobo: job.pendingOffer?.amountKobo ?? null,
      offer_at: job.pendingOffer?.at ?? null,
      modes_json: JSON.stringify(job.modes),
      created_at: job.createdAt,
    });
    if (job.claim) this.#insertClaim(job.id, job.claim);
    this.#insertEvents(job.id, job.events);
  }

  #insertClaim(jobId: string, claim: ClaimRecord): void {
    this.#stmt.insertClaim.run({
      id: claim.id,
      job_id: jobId,
      filed_by: claim.filedBy,
      reason: claim.reason,
      details: claim.details,
      ref: claim.ref,
      status: claim.status,
      created_at: claim.createdAt,
    });
  }

  #insertEvents(jobId: string, events: EventRecord[]): void {
    for (const e of events) {
      this.#stmt.insertEvent.run({ job_id: jobId, type: e.type, detail: e.detail, created_at: e.at });
    }
  }
}

function userFromRow(row: UserRow | undefined): UserRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    trade: row.trade,
    email: row.email,
    passwordHash: row.password_hash,
  };
}
