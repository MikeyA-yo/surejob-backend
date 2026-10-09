import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { MongoClient } from "mongodb";
import { IN_MEMORY, openDatabase } from "../src/store/db.ts";
import { MongoStore } from "../src/store/mongoStore.ts";
import { SEED_CUSTOMER, SEED_WORKER } from "../src/store/seed.ts";
import { SqliteStore } from "../src/store/sqliteStore.ts";
import { DuplicateEmailError, type JobRecord, type Store, type UserRecord } from "../src/store/types.ts";

const CUSTOMER: UserRecord = { ...SEED_CUSTOMER, passwordHash: "scrypt$hash" };
const WORKER: UserRecord = { ...SEED_WORKER, passwordHash: "scrypt$hash" };
/** A worker with no account. */
const GUEST_WORKER: UserRecord = {
  id: "usr_musa",
  name: "Musa",
  role: "worker",
  phone: "+2348031112222",
  trade: "plumber",
  email: null,
  passwordHash: null,
};

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: `job_${randomBytes(4).toString("hex")}`,
    customerId: SEED_CUSTOMER.id,
    workerId: SEED_WORKER.id,
    title: "Brake repair",
    amountKobo: 1_500_000,
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
    pendingOffer: null,
    modes: { payment: "mock", insurance: "mock", payout: "mock" },
    createdAt: "2026-10-09T10:00:00.000Z",
    claim: null,
    events: [{ type: "job.booked", at: "2026-10-09T10:00:00.000Z", detail: "booked" }],
    ...overrides,
  };
}

/** The behaviour JobService relies on, checked identically for every Store implementation. */
function storeContract(name: string, open: () => Promise<{ store: Store; cleanup: () => Promise<void> }>) {
  describe(`${name} store`, () => {
    let store: Store;
    let cleanup: () => Promise<void>;

    before(async () => {
      ({ store, cleanup } = await open());
    });
    after(async () => {
      await store.close();
      await cleanup();
    });

    it("reset replaces everything with the given users and job", async () => {
      await store.reset([CUSTOMER, WORKER], job({ id: "job_old" }));
      const seeded = job();
      await store.reset([CUSTOMER, WORKER], seeded);

      assert.equal(await store.hasUsers(), true);
      assert.deepEqual(await store.getUser(SEED_WORKER.id), WORKER);
      assert.equal(await store.getUser("usr_nobody"), null);
      assert.equal(await store.getJob("job_old"), null);
      assert.deepEqual(await store.getJob(seeded.id), seeded);
    });

    it("finds users by email, rejects duplicate emails, and allows many users without one", async () => {
      await store.reset([CUSTOMER, WORKER], job());
      assert.deepEqual(await store.getUserByEmail("tunde@example.com"), CUSTOMER);
      assert.equal(await store.getUserByEmail("nobody@example.com"), null);

      await assert.rejects(store.insertUser({ ...CUSTOMER, id: "usr_dup" }), DuplicateEmailError);
      await store.insertUser(GUEST_WORKER);
      await store.insertUser({ ...GUEST_WORKER, id: "usr_musa2" });
      assert.deepEqual(await store.getUser(GUEST_WORKER.id), GUEST_WORKER);
    });

    it("lists only workers with an account", async () => {
      await store.reset([CUSTOMER, WORKER], job());
      await store.insertUser(GUEST_WORKER);
      assert.deepEqual(await store.listWorkers(), [WORKER]);
    });

    it("lists a user's jobs as customer or worker, newest first", async () => {
      const older = job({ createdAt: "2026-10-09T09:00:00.000Z" });
      await store.reset([CUSTOMER, WORKER], older);
      await store.insertUser(GUEST_WORKER);
      const newer = job({ workerId: GUEST_WORKER.id, createdAt: "2026-10-09T11:00:00.000Z" });
      await store.insertJob(newer);

      assert.deepEqual((await store.listJobsForUser(CUSTOMER.id)).map((j) => j.id), [newer.id, older.id]);
      assert.deepEqual((await store.listJobsForUser(WORKER.id)).map((j) => j.id), [older.id]);
      assert.deepEqual(await store.listJobsForUser("usr_nobody"), []);
    });

    it("insertJob round-trips every field", async () => {
      const full = job({
        premiumKobo: 30_000,
        status: "INSURED",
        quoteId: "QTE-1",
        escrowRef: "ESC-1",
        policyRef: "POL-1",
        modes: { payment: "live", insurance: "mock", payout: "live" },
      });
      await store.insertJob(full);
      assert.deepEqual(await store.getJob(full.id), full);
    });

    it("updateJob applies set, events and claim atomically when the status matches", async () => {
      const j = job({ status: "INSURED", policyRef: "POL-1" });
      await store.insertJob(j);
      const claim = {
        id: "clm_1",
        filedBy: "customer" as const,
        reason: "damage" as const,
        details: "",
        ref: "CLM-1",
        status: "received",
        createdAt: "2026-10-09T11:00:00.000Z",
      };
      const updated = await store.updateJob(j.id, {
        expectStatus: "INSURED",
        set: { status: "CLAIM_FILED", modes: { ...j.modes, insurance: "live" } },
        events: [
          { type: "a", at: "2026-10-09T11:00:00.000Z", detail: "1" },
          { type: "b", at: "2026-10-09T11:00:00.000Z", detail: "2" },
        ],
        claim,
      });
      assert.equal(updated?.status, "CLAIM_FILED");
      assert.equal(updated?.modes.insurance, "live");
      assert.deepEqual(updated?.claim, claim);
      assert.deepEqual(updated?.events.map((e) => e.type), ["job.booked", "a", "b"]);
      assert.deepEqual(await store.getJob(j.id), updated);
    });

    it("updateJob sets and clears a price offer and changes the amount", async () => {
      const j = job();
      await store.insertJob(j);
      const offer = { by: "worker" as const, amountKobo: 1_800_000, at: "2026-10-09T10:30:00.000Z" };
      const offered = await store.updateJob(j.id, { expectStatus: "BOOKED", set: { pendingOffer: offer }, events: [] });
      assert.deepEqual(offered?.pendingOffer, offer);
      assert.deepEqual((await store.getJob(j.id))?.pendingOffer, offer);

      const agreed = await store.updateJob(j.id, {
        expectStatus: "BOOKED",
        set: { amountKobo: 1_800_000, pendingOffer: null, quoteId: null, premiumKobo: null },
        events: [],
      });
      assert.equal(agreed?.amountKobo, 1_800_000);
      assert.equal(agreed?.pendingOffer, null);
    });

    it("updateJob changes nothing and returns null when the status moved on or the job is gone", async () => {
      const j = job();
      await store.insertJob(j);
      const stale = await store.updateJob(j.id, {
        expectStatus: "ESCROWED",
        set: { status: "INSURED" },
        events: [{ type: "x", at: "2026-10-09T11:00:00.000Z", detail: "" }],
      });
      assert.equal(stale, null);
      assert.deepEqual(await store.getJob(j.id), j);
      assert.equal(await store.updateJob("job_missing", { expectStatus: "BOOKED", set: {}, events: [] }), null);
    });

    it("appendEvents ignores status and is a no-op for a missing job", async () => {
      const j = job({ status: "PAID_OUT" });
      await store.insertJob(j);
      await store.appendEvents(j.id, [{ type: "payout.issueToken.failed", at: "2026-10-09T12:00:00.000Z", detail: "x" }]);
      assert.deepEqual((await store.getJob(j.id))?.events.map((e) => e.type), ["job.booked", "payout.issueToken.failed"]);
      await store.appendEvents("job_missing", [{ type: "x", at: "2026-10-09T12:00:00.000Z", detail: "" }]);
    });
  });
}

storeContract("sqlite", async () => ({ store: new SqliteStore(openDatabase(IN_MEMORY)), cleanup: async () => {} }));

// Runs against a real MongoDB only when MONGO_TEST_URI is set; uses a throwaway database.
const mongoUri = process.env["MONGO_TEST_URI"];
if (mongoUri) {
  storeContract("mongo", async () => {
    const dbName = `surejob_test_${randomBytes(4).toString("hex")}`;
    return {
      store: await MongoStore.connect(mongoUri, dbName),
      cleanup: async () => {
        const client = await new MongoClient(mongoUri).connect();
        await client.db(dbName).dropDatabase();
        await client.close();
      },
    };
  });
}
