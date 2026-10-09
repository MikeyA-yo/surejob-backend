import { MongoClient, MongoServerError, type Collection, type Db, type UpdateFilter } from "mongodb";
import { DuplicateEmailError, type EventRecord, type JobRecord, type JobUpdate, type Store, type UserRecord } from "./types.ts";

type UserDoc = Omit<UserRecord, "id"> & { _id: string };
/** A job is one document: its claim and event timeline are embedded, so every update is atomic. */
type JobDoc = Omit<JobRecord, "id"> & { _id: string };

/**
 * MongoDB store, used when MONGO_URI is set (e.g. on Render, whose disk is wiped on deploy).
 * Transitions are single-document conditional updates (`{ _id, status: expected }`), so no
 * multi-document transactions are needed.
 */
export class MongoStore implements Store {
  readonly kind = "mongo";
  readonly #client: MongoClient;
  readonly #users: Collection<UserDoc>;
  readonly #jobs: Collection<JobDoc>;

  private constructor(client: MongoClient, db: Db) {
    this.#client = client;
    this.#users = db.collection<UserDoc>("users");
    this.#jobs = db.collection<JobDoc>("jobs");
  }

  /** Connects and pings, so a bad URI or blocked network fails at startup rather than on the first request. */
  static async connect(uri: string, dbName: string): Promise<MongoStore> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: "surejob-api" });
    try {
      await client.connect();
      const db = client.db(dbName);
      await db.command({ ping: 1 });
      const store = new MongoStore(client, db);
      await store.#ensureIndexes();
      return store;
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }
  }

  async hasUsers(): Promise<boolean> {
    return (await this.#users.countDocuments({}, { limit: 1 })) > 0;
  }

  async getUser(id: string): Promise<UserRecord | null> {
    const doc = await this.#users.findOne({ _id: id });
    return doc ? fromDoc(doc) : null;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const doc = await this.#users.findOne({ email });
    return doc ? fromDoc(doc) : null;
  }

  async insertUser(user: UserRecord): Promise<void> {
    try {
      await this.#users.insertOne(toDoc(user));
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) throw new DuplicateEmailError(user.email ?? "");
      throw err;
    }
  }

  async listWorkers(): Promise<UserRecord[]> {
    const docs = await this.#users.find({ role: "worker", email: { $type: "string" } }).sort({ name: 1 }).toArray();
    return docs.map(fromDoc);
  }

  async listJobsForUser(userId: string): Promise<JobRecord[]> {
    const docs = await this.#jobs
      .find({ $or: [{ customerId: userId }, { workerId: userId }] })
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(jobFromDoc);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const doc = await this.#jobs.findOne({ _id: id });
    return doc ? jobFromDoc(doc) : null;
  }

  async insertJob(job: JobRecord): Promise<void> {
    await this.#jobs.insertOne(toDoc(job));
  }

  async updateJob(id: string, update: JobUpdate): Promise<JobRecord | null> {
    const set: Partial<JobDoc> = { ...withoutUndefined(update.set), ...(update.claim && { claim: update.claim }) };
    const ops: UpdateFilter<JobDoc> = {};
    if (Object.keys(set).length > 0) ops.$set = set;
    if (update.events.length > 0) ops.$push = { events: { $each: update.events } };
    if (Object.keys(ops).length === 0) return this.getJob(id);

    const doc = await this.#jobs.findOneAndUpdate({ _id: id, status: update.expectStatus }, ops, {
      returnDocument: "after",
    });
    return doc ? jobFromDoc(doc) : null;
  }

  async appendEvents(id: string, events: EventRecord[]): Promise<void> {
    if (events.length === 0) return;
    await this.#jobs.updateOne({ _id: id }, { $push: { events: { $each: events } } });
  }

  async reset(users: UserRecord[], job: JobRecord): Promise<void> {
    await Promise.all([this.#jobs.deleteMany({}), this.#users.deleteMany({})]);
    await Promise.all([this.#users.insertMany(users.map(toDoc)), this.#jobs.insertOne(toDoc(job))]);
  }

  async close(): Promise<void> {
    await this.#client.close();
  }

  async #ensureIndexes(): Promise<void> {
    await Promise.all([
      // Unique only among users that have an email (off-platform workers have none).
      this.#users.createIndex(
        { email: 1 },
        { name: "users_by_email", unique: true, partialFilterExpression: { email: { $type: "string" } } },
      ),
      this.#jobs.createIndex({ customerId: 1, createdAt: -1 }, { name: "jobs_by_customer" }),
      this.#jobs.createIndex({ workerId: 1, createdAt: -1 }, { name: "jobs_by_worker" }),
    ]);
  }
}

function toDoc<T extends { id: string }>(record: T): Omit<T, "id"> & { _id: string } {
  const { id, ...rest } = record;
  return { _id: id, ...rest };
}

function fromDoc<T extends { _id: string }>(doc: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

/** Jobs written before a field existed lack it; fill the defaults. */
function jobFromDoc(doc: JobDoc): JobRecord {
  const job = fromDoc(doc);
  return { ...job, pendingOffer: job.pendingOffer ?? null };
}

function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
