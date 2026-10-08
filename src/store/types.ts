import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import type { Modes } from "../adapters/types.ts";
import type { JobStatus } from "../jobs/stateMachine.ts";

export type Party = "customer" | "worker";

export interface UserRecord {
  id: string;
  name: string;
  role: Party;
  phone: string;
  trade: string | null;
  /** Lowercase. null for a worker added by a customer who has no SureJob account. */
  email: string | null;
  /** scrypt hash (see auth/passwords.ts). null when the user cannot log in. */
  passwordHash: string | null;
}

/** Thrown by insertUser when the email is already registered. */
export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`${email} is already registered`);
    this.name = "DuplicateEmailError";
  }
}

export interface EventRecord {
  type: string;
  /** ISO 8601. */
  at: string;
  detail: string;
}

export interface ClaimRecord {
  id: string;
  filedBy: Party;
  reason: ClaimReason;
  details: string;
  ref: string;
  status: string;
  createdAt: string;
}

/** A job with its claim and event timeline, as every store returns it. Times are ISO 8601. */
export interface JobRecord {
  id: string;
  customerId: string;
  workerId: string;
  title: string;
  amountKobo: number;
  premiumKobo: number | null;
  status: JobStatus;
  quoteId: string | null;
  escrowRef: string | null;
  policyRef: string | null;
  payoutCode: string | null;
  payoutRef: string | null;
  payoutExpiresAt: string | null;
  customerConfirmedAt: string | null;
  workerConfirmedAt: string | null;
  /** The mode each adapter actually ran in for this job. */
  modes: Modes;
  createdAt: string;
  claim: ClaimRecord | null;
  events: EventRecord[];
}

export type JobPatch = Partial<
  Pick<
    JobRecord,
    | "premiumKobo"
    | "status"
    | "quoteId"
    | "escrowRef"
    | "policyRef"
    | "payoutCode"
    | "payoutRef"
    | "payoutExpiresAt"
    | "customerConfirmedAt"
    | "workerConfirmedAt"
    | "modes"
  >
>;

export interface JobUpdate {
  /** The update applies only while the job is still in this status. */
  expectStatus: JobStatus;
  set: JobPatch;
  /** Appended to the timeline in the same atomic write. */
  events: EventRecord[];
  claim?: ClaimRecord;
}

/**
 * Persistence. Implemented by SqliteStore (local, offline, tests) and MongoStore (MONGO_URI).
 * Every job change goes through `updateJob`, which applies the patch, the events and any claim
 * atomically and only if the status still matches. That status check is what keeps two writers
 * from both applying a transition.
 */
export interface Store {
  readonly kind: "sqlite" | "mongo";
  /** False on an empty database, which then gets seeded. */
  hasUsers(): Promise<boolean>;
  getUser(id: string): Promise<UserRecord | null>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  /** Throws DuplicateEmailError if the email is taken. */
  insertUser(user: UserRecord): Promise<void>;
  /** Workers with an account, by name. */
  listWorkers(): Promise<UserRecord[]>;
  /** Jobs where the user is the customer or the worker, newest first. */
  listJobsForUser(userId: string): Promise<JobRecord[]>;
  getJob(id: string): Promise<JobRecord | null>;
  insertJob(job: JobRecord): Promise<void>;
  /** Returns the updated job, or null if the job is gone or no longer in `expectStatus`. */
  updateJob(id: string, update: JobUpdate): Promise<JobRecord | null>;
  /** Appends events with no status check (used to log failures). No-op if the job is gone. */
  appendEvents(id: string, events: EventRecord[]): Promise<void>;
  /** Replaces all users and jobs with exactly these. */
  reset(users: UserRecord[], job: JobRecord): Promise<void>;
  close(): Promise<void>;
}
