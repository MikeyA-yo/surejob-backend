import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createAdapters } from "../src/adapters/index.ts";
import { MockRuntime, type FailurePoint } from "../src/adapters/mock/runtime.ts";
import type { Modes } from "../src/adapters/types.ts";
import { createApp } from "../src/httpapi/app.ts";
import { JobService } from "../src/jobs/service.ts";
import type { JobView } from "../src/jobs/view.ts";
import { silentLogger } from "../src/logger.ts";
import { IN_MEMORY, openDatabase } from "../src/store/db.ts";
import { Store } from "../src/store/store.ts";

export interface TestServerOptions {
  modes?: Partial<Modes>;
  failOnce?: FailurePoint[];
  latencyMs?: number;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export interface TestServer {
  seedJobId: string;
  baseUrl: string;
  request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>>;
  close(): Promise<void>;
}

/** Full app on an in-memory database and an ephemeral port, mocks with no latency by default. */
export async function startTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const db = openDatabase(IN_MEMORY);
  const latency = options.latencyMs ?? 0;
  const mockRuntime = new MockRuntime({ latency: { minMs: latency, maxMs: latency }, failOnce: options.failOnce ?? [] });
  const modes: Modes = { payment: "mock", insurance: "mock", payout: "mock", ...options.modes };
  const jobs = new JobService({
    store: new Store(db),
    adapters: createAdapters({ modes, mockRuntime, logger: silentLogger }),
    logger: silentLogger,
    maxAmountKobo: 50_000_000,
    coverDurationDays: 30,
    onDemoReset: () => mockRuntime.rearm(),
  });
  const seedJobId = jobs.ensureSeeded()!;

  const app = createApp({ jobs, logger: silentLogger, corsOrigins: ["http://localhost:3000"] });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  return {
    seedJobId,
    baseUrl: base,
    async request(method, path, body) {
      const init: RequestInit = { method };
      if (body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      const res = await fetch(base + path, init);
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : undefined };
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      db.close();
    },
  };
}

export const SEED_BOOKING = {
  customerId: "usr_tunde",
  workerId: "usr_emeka",
  title: "Brake repair",
  amountKobo: 1_500_000,
};

/** Books, quotes and pays a job, returning it INSURED. */
export async function insuredJob(api: TestServer): Promise<JobView> {
  const { body: job } = await api.request<JobView>("POST", "/api/jobs", SEED_BOOKING);
  const { body: quote } = await api.request("POST", `/api/jobs/${job.id}/quote`);
  const paid = await api.request<JobView>("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
  if (paid.status !== 200) throw new Error(`pay failed: ${JSON.stringify(paid.body)}`);
  return paid.body;
}

export function eventTypes(job: JobView): string[] {
  return job.events.map((e) => e.type);
}
