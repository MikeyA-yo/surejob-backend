import { createAdapters } from "./adapters/index.ts";
import { MockRuntime } from "./adapters/mock/runtime.ts";
import { loadConfig } from "./config.ts";
import { createApp } from "./httpapi/app.ts";
import { JobService } from "./jobs/service.ts";
import { createLogger } from "./logger.ts";
import { openDatabase } from "./store/db.ts";
import { Store } from "./store/store.ts";

const log = createLogger();

function main(): void {
  const config = loadConfig();

  const db = openDatabase(config.dbPath);
  const mockRuntime = new MockRuntime(config.mock);
  const jobs = new JobService({
    store: new Store(db),
    adapters: createAdapters({ modes: config.modes, mockRuntime, logger: log, ecobank: config.ecobank }),
    logger: log,
    maxAmountKobo: config.jobs.maxAmountKobo,
    coverDurationDays: config.jobs.coverDurationDays,
    onDemoReset: () => mockRuntime.rearm(),
  });

  if (config.ecobank?.signing.kind === "static" && (config.modes.payment === "live" || config.modes.payout === "live")) {
    log.warn("ecobank requests use fixed requestToken/secureHash (no ECOBANK_SECRET_KEY); sandbox only");
  }

  const seededJobId = jobs.ensureSeeded();
  if (seededJobId) log.info("seeded fresh database", { jobId: seededJobId });

  const app = createApp({ jobs, logger: log, corsOrigins: config.corsOrigins });
  const server = app.listen(config.port, config.host, (err) => {
    if (err) {
      log.error("failed to start", { error: err.message });
      process.exit(1);
    }
    log.info("listening", {
      url: `http://${config.host}:${config.port}`,
      db: config.dbPath,
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
      db.close();
      process.exit(0);
    });
    server.closeAllConnections();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

try {
  main();
} catch (err) {
  log.error("startup failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
