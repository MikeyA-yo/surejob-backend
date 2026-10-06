import { z } from "zod";
import type { AdapterMode, Modes } from "./adapters/types.ts";
import { FAILURE_POINTS, type FailurePoint } from "./adapters/mock/runtime.ts";

export interface Config {
  port: number;
  host: string;
  dbPath: string;
  /** Allowed browser origins. "*" allows any. */
  corsOrigins: readonly string[];
  modes: Modes;
  mock: {
    latency: { minMs: number; maxMs: number };
    /** Each listed point fails exactly once (re-armed by POST /api/demo/reset). */
    failOnce: readonly FailurePoint[];
  };
  jobs: {
    maxAmountKobo: number;
    coverDurationDays: number;
  };
}

const mode = z.enum(["mock", "live"]).default("mock") satisfies z.ZodType<AdapterMode>;

/** "300-800" → { 300, 800 }, "0" → { 0, 0 }. */
const latencyRange = z
  .string()
  .trim()
  .regex(/^\d+(\s*-\s*\d+)?$/, 'expected "<ms>" or "<min>-<max>", e.g. "300-800"')
  .transform((raw) => {
    const [min, max = min] = raw.split("-").map((part) => Number(part.trim()));
    return { minMs: min ?? 0, maxMs: max ?? 0 };
  })
  .refine((r) => r.minMs <= r.maxMs, "min latency must not exceed max latency");

const failurePoints = z
  .string()
  .transform((raw) =>
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.enum(FAILURE_POINTS)));

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().min(1).default("127.0.0.1"),
  DB_PATH: z.string().min(1).default("data/surejob.db"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  PAYMENT_MODE: mode,
  INSURANCE_MODE: mode,
  PAYOUT_MODE: mode,

  MOCK_LATENCY_MS: latencyRange.default({ minMs: 300, maxMs: 800 }),
  MOCK_FAIL: failurePoints.default([]),

  MAX_JOB_AMOUNT_KOBO: z.coerce.number().int().positive().default(50_000_000), // ₦500,000
  COVER_DURATION_DAYS: z.coerce.number().int().positive().default(30),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Treat empty strings as unset so `FOO=` in .env falls back to the default.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const e = parsed.data;

  return {
    port: e.PORT,
    host: e.HOST,
    dbPath: e.DB_PATH,
    corsOrigins: e.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    modes: { payment: e.PAYMENT_MODE, insurance: e.INSURANCE_MODE, payout: e.PAYOUT_MODE },
    mock: { latency: e.MOCK_LATENCY_MS, failOnce: e.MOCK_FAIL },
    jobs: { maxAmountKobo: e.MAX_JOB_AMOUNT_KOBO, coverDurationDays: e.COVER_DURATION_DAYS },
  };
}
