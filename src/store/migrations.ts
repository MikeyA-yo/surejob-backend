import type { DatabaseSync } from "node:sqlite";

/** Append-only. Each entry runs once, tracked through PRAGMA user_version. */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE users (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    role  TEXT NOT NULL CHECK (role IN ('customer', 'worker')),
    phone TEXT NOT NULL,
    trade TEXT
  );

  CREATE TABLE jobs (
    id                    TEXT PRIMARY KEY,
    customer_id           TEXT NOT NULL REFERENCES users(id),
    worker_id             TEXT NOT NULL REFERENCES users(id),
    title                 TEXT NOT NULL,
    amount_kobo           INTEGER NOT NULL CHECK (amount_kobo > 0),
    premium_kobo          INTEGER CHECK (premium_kobo >= 0),
    status                TEXT NOT NULL CHECK (status IN ('BOOKED', 'ESCROWED', 'INSURED', 'CONFIRMED', 'PAID_OUT', 'CLAIM_FILED')),
    quote_id              TEXT,
    escrow_ref            TEXT,
    policy_ref            TEXT,
    payout_code           TEXT,
    payout_ref            TEXT,
    payout_expires_at     TEXT,
    customer_confirmed_at TEXT,
    worker_confirmed_at   TEXT,
    modes_json            TEXT NOT NULL,
    created_at            TEXT NOT NULL
  );

  CREATE TABLE claims (
    id         TEXT PRIMARY KEY,
    job_id     TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    filed_by   TEXT NOT NULL CHECK (filed_by IN ('customer', 'worker')),
    reason     TEXT NOT NULL CHECK (reason IN ('damage', 'injury', 'not_done')),
    details    TEXT NOT NULL DEFAULT '',
    ref        TEXT NOT NULL,
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    detail     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX events_by_job ON events (job_id, id);
  `,
  // 2: accounts (email + password) and "my jobs" lookups.
  `
  ALTER TABLE users ADD COLUMN email TEXT;
  ALTER TABLE users ADD COLUMN password_hash TEXT;
  CREATE UNIQUE INDEX users_by_email ON users (email) WHERE email IS NOT NULL;
  CREATE INDEX jobs_by_customer ON jobs (customer_id, created_at);
  CREATE INDEX jobs_by_worker ON jobs (worker_id, created_at);
  `,
  // 3: price negotiation (one open offer per job).
  `
  ALTER TABLE jobs ADD COLUMN offer_by TEXT CHECK (offer_by IN ('customer', 'worker'));
  ALTER TABLE jobs ADD COLUMN offer_amount_kobo INTEGER CHECK (offer_amount_kobo > 0);
  ALTER TABLE jobs ADD COLUMN offer_at TEXT;
  `,
  // 4: worker price agreement and the SureJob service fee.
  `
  ALTER TABLE jobs ADD COLUMN agreed_amount_kobo INTEGER;
  ALTER TABLE jobs ADD COLUMN fee_kobo INTEGER CHECK (fee_kobo >= 0);
  `,
];

export function migrate(db: DatabaseSync): void {
  const current = Number(db.prepare("PRAGMA user_version").get()?.["user_version"] ?? 0);
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[version]!);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`migration ${version + 1} failed`, { cause: err });
    }
  }
}
