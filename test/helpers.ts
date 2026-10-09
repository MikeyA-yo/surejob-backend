import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createAdapters } from "../src/adapters/index.ts";
import { MockRuntime, type FailurePoint } from "../src/adapters/mock/runtime.ts";
import type { Modes } from "../src/adapters/types.ts";
import { AuthService } from "../src/auth/service.ts";
import { TokenService } from "../src/auth/tokens.ts";
import { createApp } from "../src/httpapi/app.ts";
import { JobService } from "../src/jobs/service.ts";
import type { JobView } from "../src/jobs/view.ts";
import { silentLogger } from "../src/logger.ts";
import { IN_MEMORY, openDatabase } from "../src/store/db.ts";
import { SEED_CUSTOMER, SEED_PASSWORD, SEED_WORKER } from "../src/store/seed.ts";
import { SqliteStore } from "../src/store/sqliteStore.ts";

export interface TestServerOptions {
  modes?: Partial<Modes>;
  failOnce?: FailurePoint[];
  latencyMs?: number;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

type Call = <T = any>(method: string, path: string, body?: unknown) => Promise<ApiResponse<T>>;

export interface TestServer {
  seedJobId: string;
  baseUrl: string;
  /** Acts as the seeded customer, Tunde. */
  request: Call;
  /** Acts as the seeded worker, Emeka. */
  asWorker: Call;
  /** No Authorization header. */
  anon: Call;
  /** Acts with the given bearer token. */
  as(token: string): Call;
  /** The seeded worker accepts the job's current price (required before the customer can quote and pay). */
  agree(jobId: string): Promise<void>;
  /** Logs the seeded accounts in again (e.g. after a demo reset). */
  relogin(): Promise<void>;
  close(): Promise<void>;
}

/** Full app on an in-memory database and an ephemeral port, mocks with no latency by default. */
export async function startTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const db = openDatabase(IN_MEMORY);
  const store = new SqliteStore(db);
  const latency = options.latencyMs ?? 0;
  const mockRuntime = new MockRuntime({ latency: { minMs: latency, maxMs: latency }, failOnce: options.failOnce ?? [] });
  const modes: Modes = { payment: "mock", insurance: "mock", payout: "mock", ...options.modes };
  const jobs = new JobService({
    store,
    adapters: createAdapters({ modes, mockRuntime, logger: silentLogger }),
    logger: silentLogger,
    maxAmountKobo: 50_000_000,
    coverDurationDays: 30,
    fee: { percent: 2.5, minKobo: 10_000 },
    onDemoReset: () => mockRuntime.rearm(),
  });
  const auth = new AuthService({ store, tokens: new TokenService("test-secret-test-secret-test-secret", "1h"), logger: silentLogger });
  const seedJobId = (await jobs.ensureSeeded())!;

  const app = createApp({ jobs, auth, logger: silentLogger });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const call =
    (token: string | null): Call =>
    async (method, path, body) => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const init: RequestInit = { method, headers };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      const res = await fetch(base + path, init);
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : undefined };
    };

  const login = async (email: string) => {
    const res = await call(null)("POST", "/api/auth/login", { email, password: SEED_PASSWORD });
    if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
    return res.body.token as string;
  };

  const api: TestServer = {
    seedJobId,
    baseUrl: base,
    request: call(null),
    asWorker: call(null),
    anon: call(null),
    as: (token) => call(token),
    async agree(jobId) {
      const res = await api.asWorker("POST", `/api/jobs/${jobId}/agree`);
      if (res.status !== 200) throw new Error(`agree failed: ${JSON.stringify(res.body)}`);
    },
    async relogin() {
      api.request = call(await login(SEED_CUSTOMER.email!));
      api.asWorker = call(await login(SEED_WORKER.email!));
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      db.close();
    },
  };
  await api.relogin();
  return api;
}

/** Booking body for the seeded worker; the customer comes from the login. */
export const SEED_BOOKING = {
  workerId: "usr_emeka",
  title: "Brake repair",
  amountKobo: 1_500_000,
};

/** Books (as the customer), has a registered worker agree the price, quotes and pays; returns the job INSURED. */
export async function insuredJob(api: TestServer, booking: object = SEED_BOOKING): Promise<JobView> {
  const { body: job } = await api.request<JobView>("POST", "/api/jobs", booking);
  if (job.worker.onPlatform) await api.agree(job.id);
  const { body: quote } = await api.request("POST", `/api/jobs/${job.id}/quote`);
  const paid = await api.request<JobView>("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
  if (paid.status !== 200) throw new Error(`pay failed: ${JSON.stringify(paid.body)}`);
  return paid.body;
}

export function eventTypes(job: JobView): string[] {
  return job.events.map((e) => e.type);
}
