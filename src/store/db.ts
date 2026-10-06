import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrations.ts";

export const IN_MEMORY = ":memory:";

/** Opens (creating if needed) the SQLite file and brings the schema up to date. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  migrate(db);
  return db;
}

/**
 * Runs `fn` inside a single write transaction. `fn` must be synchronous: node:sqlite is
 * synchronous, so nothing else can touch the database between BEGIN and COMMIT.
 */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    if (result instanceof Promise) throw new Error("withTransaction callback must be synchronous");
    db.exec("COMMIT");
    return result;
  } catch (err) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw err;
  }
}
