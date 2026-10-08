import { z } from "zod";
import type { AdapterMode, Modes } from "./adapters/types.ts";
import { FAILURE_POINTS, type FailurePoint } from "./adapters/mock/runtime.ts";

export interface Config {
  port: number;
  host: string;
  /** SQLite file, used when mongoUri is not set. */
  dbPath: string;
  /** When set, MongoDB is the store (e.g. on Render, whose disk is wiped on every deploy). */
  mongoUri: string | null;
  mongoDb: string;
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
  auth: {
    /** HS256 key. null when JWT_SECRET is unset: a random per-process key is used instead. */
    jwtSecret: string | null;
    /** Token lifetime, e.g. "7d", "12h". */
    jwtTtl: string;
  };
  /** null when the ECOBANK_* credentials are not set (fine while payment and payout are mocked). */
  ecobank: EcobankConfig | null;
}

/** Ecobank API gateway credentials. All of these come from the developer portal; none are committed. */
export interface EcobankConfig {
  baseUrl: string;
  /** Sent as Ocp-Apim-Subscription-Key on every call. Secret. */
  subscriptionKey: string;
  affiliateCode: string;
  clientId: string;
  sourceCode: string;
  ipAddress: string;
  /** Secret. */
  publicKey: string;
  signing: EcobankSigning;
  /** serviceCode the payment adapter requests its token for, e.g. DOMESTIC. */
  paymentServiceCode: string;
  /** serviceCode for XpressCash token calls (TOKEN in UAT). */
  payoutServiceCode: string;
  /** Currency for XpressCash tokens. The UAT sample account is Ghanaian (EGH), so GHS there. */
  payoutCurrency: string;
  timeoutMs: number;
}

/**
 * How requestToken/secureHash are produced:
 * - "secret": computed per request from ECOBANK_SECRET_KEY (works for every endpoint).
 * - "static": fixed values copied from the portal and reused for every request. Only works where
 *   the gateway does not check hashes, which is the case in the UAT sandbox.
 */
export type EcobankSigning =
  | { kind: "secret"; secretKey: string }
  | { kind: "static"; requestToken: string; secureHash: string };

/** Always-required ECOBANK_* variables, keyed by the EcobankConfig field they fill. */
const ECOBANK_REQUIRED = {
  subscriptionKey: "ECOBANK_SUBSCRIPTION_KEY",
  affiliateCode: "ECOBANK_AFFILIATE_CODE",
  clientId: "ECOBANK_CLIENT_ID",
  sourceCode: "ECOBANK_SOURCE_CODE",
  publicKey: "ECOBANK_PUBLIC_KEY",
} as const;

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
  MONGO_URI: z.string().trim().regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://").optional(),
  MONGO_DB: z.string().trim().min(1).default("surejob"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  PAYMENT_MODE: mode,
  INSURANCE_MODE: mode,
  PAYOUT_MODE: mode,

  MOCK_LATENCY_MS: latencyRange.default({ minMs: 300, maxMs: 800 }),
  MOCK_FAIL: failurePoints.default([]),

  MAX_JOB_AMOUNT_KOBO: z.coerce.number().int().positive().default(50_000_000), // ₦500,000
  COVER_DURATION_DAYS: z.coerce.number().int().positive().default(30),

  JWT_SECRET: z.string().min(32, "must be at least 32 characters").optional(),
  JWT_TTL: z.string().regex(/^\d+[smhdw]$/, 'e.g. "7d" or "12h"').default("7d"),

  ECOBANK_BASE_URL: z.url().default("https://apimuat-gateway.ecobank.com"),
  ECOBANK_SUBSCRIPTION_KEY: z.string().trim().optional(),
  ECOBANK_AFFILIATE_CODE: z.string().trim().optional(),
  ECOBANK_CLIENT_ID: z.string().trim().optional(),
  ECOBANK_SOURCE_CODE: z.string().trim().optional(),
  ECOBANK_PUBLIC_KEY: z.string().trim().optional(),
  ECOBANK_REQUEST_TOKEN: z.string().trim().optional(),
  ECOBANK_SECURE_HASH: z.string().trim().optional(),
  ECOBANK_SECRET_KEY: z.string().trim().optional(),
  ECOBANK_IP_ADDRESS: z.string().trim().min(1).default("127.0.0.1"),
  ECOBANK_PAYMENT_SERVICE_CODE: z.string().trim().min(1).default("DOMESTIC"),
  ECOBANK_PAYOUT_SERVICE_CODE: z.string().trim().min(1).default("TOKEN"),
  ECOBANK_PAYOUT_CURRENCY: z.string().trim().length(3).toUpperCase().default("NGN"),
  ECOBANK_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

type Env = z.output<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = parseEnv(env);

  const ecobank = ecobankConfig(e);
  const needsEcobank = e.PAYMENT_MODE === "live" || e.PAYOUT_MODE === "live";
  if (needsEcobank && "missing" in ecobank) {
    throw new Error(`PAYMENT_MODE/PAYOUT_MODE=live needs Ecobank credentials. Missing: ${ecobank.missing.join(", ")}`);
  }

  return {
    port: e.PORT,
    host: e.HOST,
    dbPath: e.DB_PATH,
    mongoUri: e.MONGO_URI ?? null,
    mongoDb: e.MONGO_DB,
    corsOrigins: e.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    modes: { payment: e.PAYMENT_MODE, insurance: e.INSURANCE_MODE, payout: e.PAYOUT_MODE },
    mock: { latency: e.MOCK_LATENCY_MS, failOnce: e.MOCK_FAIL },
    jobs: { maxAmountKobo: e.MAX_JOB_AMOUNT_KOBO, coverDurationDays: e.COVER_DURATION_DAYS },
    auth: { jwtSecret: e.JWT_SECRET ?? null, jwtTtl: e.JWT_TTL },
    ecobank: "missing" in ecobank ? null : ecobank,
  };
}

export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
  // Treat empty strings as unset so `FOO=` in .env falls back to the default.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

/** Builds the Ecobank config, or lists the variables still missing. */
export function ecobankConfig(e: Env): EcobankConfig | { missing: string[] } {
  const values = {
    subscriptionKey: e.ECOBANK_SUBSCRIPTION_KEY,
    affiliateCode: e.ECOBANK_AFFILIATE_CODE,
    clientId: e.ECOBANK_CLIENT_ID,
    sourceCode: e.ECOBANK_SOURCE_CODE,
    publicKey: e.ECOBANK_PUBLIC_KEY,
  };
  const missing: string[] = (Object.keys(ECOBANK_REQUIRED) as (keyof typeof ECOBANK_REQUIRED)[])
    .filter((field) => !values[field])
    .map((field) => ECOBANK_REQUIRED[field]);

  let signing: EcobankSigning | undefined;
  if (e.ECOBANK_SECRET_KEY) {
    signing = { kind: "secret", secretKey: e.ECOBANK_SECRET_KEY };
  } else if (e.ECOBANK_REQUEST_TOKEN && e.ECOBANK_SECURE_HASH) {
    signing = { kind: "static", requestToken: e.ECOBANK_REQUEST_TOKEN, secureHash: e.ECOBANK_SECURE_HASH };
  } else {
    missing.push("ECOBANK_SECRET_KEY (or ECOBANK_REQUEST_TOKEN + ECOBANK_SECURE_HASH)");
  }
  if (missing.length > 0 || !signing) return { missing };

  return {
    ...(values as Record<keyof typeof ECOBANK_REQUIRED, string>),
    signing,
    baseUrl: e.ECOBANK_BASE_URL.replace(/\/+$/, ""),
    ipAddress: e.ECOBANK_IP_ADDRESS,
    paymentServiceCode: e.ECOBANK_PAYMENT_SERVICE_CODE,
    payoutServiceCode: e.ECOBANK_PAYOUT_SERVICE_CODE,
    payoutCurrency: e.ECOBANK_PAYOUT_CURRENCY,
    timeoutMs: e.ECOBANK_TIMEOUT_MS,
  };
}
