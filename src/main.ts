import { createAdapters } from "./adapters/index.ts";
import { MockRuntime } from "./adapters/mock/runtime.ts";
import { loadConfig, type Config } from "./config.ts";
import { createApp } from "./httpapi/app.ts";
import { JobService } from "./jobs/service.ts";
import { createLogger } from "./logger.ts";
import { openDatabase } from "./store/db.ts";
import { MongoStore } from "./store/mongoStore.ts";
import { SqliteStore } from "./store/sqliteStore.ts";
import type { Store } from "./store/types.ts";

const log = createLogger();

/** MongoDB when MONGO_URI is set, otherwise the local SQLite file. */
async function openStore(config: Config): Promise<Store> {
  if (config.mongoUri) {
    const store = await MongoStore.connect(config.mongoUri, config.mongoDb);
    log.info("store connected", { store: "mongo", db: config.mongoDb });
    return store;
  }
  log.info("store opened", { store: "sqlite", db: config.dbPath });
  return new SqliteStore(openDatabase(config.dbPath));
}

async function main(): Promise<void> {
  const config = loadConfig();

  const store = await openStore(config);
  const mockRuntime = new MockRuntime(config.mock);
  const jobs = new JobService({
    store,
    adapters: createAdapters({ modes: config.modes, mockRuntime, logger: log, ecobank: config.ecobank }),
    logger: log,
    maxAmountKobo: config.jobs.maxAmountKobo,
    coverDurationDays: config.jobs.coverDurationDays,
    onDemoReset: () => mockRuntime.rearm(),
  });

  if (config.ecobank?.signing.kind === "static" && (config.modes.payment === "live" || config.modes.payout === "live")) {
    log.warn("ecobank requests use fixed requestToken/secureHash (no ECOBANK_SECRET_KEY); sandbox only");
  }

  const seededJobId = await jobs.ensureSeeded();
  if (seededJobId) log.info("seeded empty database", { jobId: seededJobId });

  const app = createApp({ jobs, logger: log, corsOrigins: config.corsOrigins });
  const server = app.listen(config.port, config.host, (err) => {
    if (err) {
      log.error("failed to start", { error: err.message });
      process.exit(1);
    }
    log.info("listening", {
      url: `http://${config.host}:${config.port}`,
      store: store.kind,
      payment: config.modes.payment,
      insurance: config.modes.insurance,
      payout: config.modes.payout,
      mockLatency: `${config.mock.latency.minMs}-${config.mock.latency.maxMs}ms`,
      mockFail: config.mock.failOnce.join(",") || "none",
    });
  });

  const shutdown = (signal: string) => {
    log.info("shutting down", { signal });
    server.close(() => {
      store.close().finally(() => process.exit(0));
    });
    server.closeAllConnections();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  log.error("startup failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
