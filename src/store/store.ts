import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite";
import type { JobStatus } from "../jobs/stateMachine.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import { withTransaction } from "./db.ts";

export type Party = "customer" | "worker";

export interface UserRow {
  id: string;
  name: string;
  role: Party;
  phone: string;
  trade: string | null;
}

export interface JobRow {
  id: string;
  customer_id: string;
  worker_id: string;
  title: string;
  amount_kobo: number;
  premium_kobo: number | null;
  status: JobStatus;
  quote_id: string | null;
  escrow_ref: string | null;
  policy_ref: string | null;
  payout_code: string | null;
  payout_ref: string | null;
  payout_expires_at: string | null;
  customer_confirmed_at: string | null;
  worker_confirmed_at: string | null;
  modes_json: string;
  created_at: string;
}

export interface ClaimRow {
  id: string;
  job_id: string;
  filed_by: Party;
  reason: ClaimReason;
  details: string;
  ref: string;
  status: string;
  created_at: string;
}

export interface EventRow {
  id: number;
  job_id: string;
  type: string;
  detail: string;
  created_at: string;
}

const UPDATABLE_JOB_COLUMNS = [
  "premium_kobo",
  "status",
  "quote_id",
  "escrow_ref",
  "policy_ref",
  "payout_code",
  "payout_ref",
  "payout_expires_at",
  "customer_confirmed_at",
  "worker_confirmed_at",
  "modes_json",
] as const satisfies readonly (keyof JobRow)[];

export type JobPatch = Partial<Pick<JobRow, (typeof UPDATABLE_JOB_COLUMNS)[number]>>;

/** All SQL lives here. Methods are synchronous; group writes with `transaction`. */
export class Store {
  readonly #db: DatabaseSync;
  readonly #stmt: Record<
    | "getUser"
    | "insertUser"
    | "getJob"
    | "insertJob"
    | "getClaim"
    | "insertClaim"
    | "listEvents"
    | "insertEvent"
    | "countUsers",
    StatementSync
  >;

  constructor(db: DatabaseSync) {
    this.#db = db;
    this.#stmt = {
      getUser: db.prepare("SELECT * FROM users WHERE id = ?"),
      insertUser: db.prepare(
        "INSERT INTO users (id, name, role, phone, trade) VALUES (:id, :name, :role, :phone, :trade)",
      ),
      getJob: db.prepare("SELECT * FROM jobs WHERE id = ?"),
      insertJob: db.prepare(`
        INSERT INTO jobs (id, customer_id, worker_id, title, amount_kobo, status, modes_json, created_at)
        VALUES (:id, :customer_id, :worker_id, :title, :amount_kobo, :status, :modes_json, :created_at)
      `),
      getClaim: db.prepare("SELECT * FROM claims WHERE job_id = ?"),
      insertClaim: db.prepare(`
        INSERT INTO claims (id, job_id, filed_by, reason, details, ref, status, created_at)
        VALUES (:id, :job_id, :filed_by, :reason, :details, :ref, :status, :created_at)
      `),
      listEvents: db.prepare("SELECT * FROM events WHERE job_id = ? ORDER BY id"),
      insertEvent: db.prepare(
        "INSERT INTO events (job_id, type, detail, created_at) VALUES (:job_id, :type, :detail, :created_at)",
      ),
      countUsers: db.prepare("SELECT COUNT(*) AS n FROM users"),
    };
  }

  transaction<T>(fn: () => T): T {
    return withTransaction(this.#db, fn);
  }

  /** Deletes every row. Used by the demo reset. */
  wipe(): void {
    this.#db.exec("DELETE FROM events; DELETE FROM claims; DELETE FROM jobs; DELETE FROM users;");
  }

  countUsers(): number {
    return Number(this.#stmt.countUsers.get()?.["n"] ?? 0);
  }

  getUser(id: string): UserRow | undefined {
    return this.#stmt.getUser.get(id) as UserRow | undefined;
  }

  insertUser(user: UserRow): void {
    this.#stmt.insertUser.run({ ...user });
  }

  getJob(id: string): JobRow | undefined {
    return this.#stmt.getJob.get(id) as JobRow | undefined;
  }

  insertJob(
    job: Pick<JobRow, "id" | "customer_id" | "worker_id" | "title" | "amount_kobo" | "status" | "modes_json" | "created_at">,
  ): void {
    this.#stmt.insertJob.run({ ...job });
  }

  updateJob(id: string, patch: JobPatch): void {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return;
    for (const [column] of entries) {
      if (!(UPDATABLE_JOB_COLUMNS as readonly string[]).includes(column)) {
        throw new Error(`jobs.${column} is not updatable`);
      }
    }
    const assignments = entries.map(([column]) => `${column} = ?`).join(", ");
    const values = entries.map(([, value]) => value as SQLInputValue);
    const result = this.#db.prepare(`UPDATE jobs SET ${assignments} WHERE id = ?`).run(...values, id);
    if (result.changes === 0) throw new Error(`job ${id} disappeared during update`);
  }

  getClaim(jobId: string): ClaimRow | undefined {
    return this.#stmt.getClaim.get(jobId) as ClaimRow | undefined;
  }

  insertClaim(claim: ClaimRow): void {
    this.#stmt.insertClaim.run({ ...claim });
  }

  listEvents(jobId: string): EventRow[] {
    return this.#stmt.listEvents.all(jobId) as unknown as EventRow[];
  }

  insertEvent(event: Omit<EventRow, "id">): void {
    this.#stmt.insertEvent.run({ ...event });
  }
}
