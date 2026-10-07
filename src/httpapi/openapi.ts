import { z } from "zod";
import { CLAIM_REASONS } from "../adapters/insurance/insurance.ts";
import { JOB_STATUSES } from "../jobs/stateMachine.ts";
import type { JobView, QuoteView } from "../jobs/view.ts";
import { claimBody, confirmBody, createJobBody, payBody } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Response schemas. These exist only for the docs; the compile-time checks below
// fail the build if they drift from the real response types.
// ---------------------------------------------------------------------------

const mode = z.enum(["mock", "live"]);

const modes = z
  .object({ payment: mode, insurance: mode, payout: mode })
  .meta({
    id: "Modes",
    description: 'Per adapter: "mock" (simulated) or "live" (provider sandbox). Show as a Simulated / Sandbox badge.',
  });

const jobStatus = z.enum(JOB_STATUSES).meta({
  id: "JobStatus",
  description:
    "BOOKED → (quote, pay) → ESCROWED → INSURED → (both confirm) → CONFIRMED → PAID_OUT. " +
    "INSURED or CONFIRMED → (claim) → CLAIM_FILED. CONFIRMED is transient: payout fires immediately.",
});

const person = z.object({ id: z.string(), name: z.string() });

const jobEvent = z
  .object({
    type: z.string().meta({ example: "payment.escrowed" }),
    at: z.string().meta({ description: "ISO 8601", example: "2026-10-09T10:00:00.000Z" }),
    detail: z.string().meta({ example: "₦15,300.00 held in escrow (ESC-7KQ2M9XA)" }),
  })
  .meta({ id: "JobEvent", description: "Timeline entry. Failed provider calls appear as `<adapter>.<operation>.failed`." });

const job = z
  .object({
    id: z.string().meta({ example: "job_3f9c2a1b7d4e5f60" }),
    title: z.string().meta({ example: "Brake repair" }),
    status: jobStatus,
    amountKobo: z.number().int().meta({ example: 1_500_000 }),
    premiumKobo: z.number().int().nullable().meta({ description: "null until quoted.", example: 30_000 }),
    totalKobo: z.number().int().meta({ description: "amountKobo + premiumKobo (premium counts as 0 until quoted).", example: 1_530_000 }),
    quoteId: z.string().nullable().meta({ description: "Latest quote; pass it to /pay.", example: "QTE-7KQ2M9XA" }),
    customer: person,
    worker: person,
    confirmations: z.object({ customer: z.boolean(), worker: z.boolean() }),
    escrowRef: z.string().nullable().meta({ example: "ESC-7KQ2M9XA" }),
    policyRef: z.string().nullable().meta({ example: "POL-4HN8QW2C" }),
    claim: z
      .object({
        ref: z.string().meta({ example: "CLM-9XT3KD7P" }),
        status: z.string().meta({ example: "received" }),
        reason: z.enum(CLAIM_REASONS),
      })
      .nullable(),
    payout: z
      .object({
        code: z.string().nullable().meta({ description: "Cash-out code. Show on the worker view only.", example: "47852170" }),
        expiresAt: z.string().nullable().meta({ example: "2026-10-10T10:00:00.000Z" }),
        ref: z.string().meta({ example: "XPC-PKS5BEPQ" }),
      })
      .nullable()
      .meta({ description: "Set once PAID_OUT. code and expiresAt are always present in mock mode." }),
    modes: modes.meta({ description: "The mode each adapter actually ran in for this job." }),
    events: z.array(jobEvent),
  })
  .meta({ id: "Job" });

const quote = z
  .object({
    quoteId: z.string().meta({ example: "QTE-7KQ2M9XA" }),
    premiumKobo: z.number().int().meta({ example: 30_000 }),
    totalKobo: z.number().int().meta({ description: "Job amount + premium: what the customer pays.", example: 1_530_000 }),
    coverage: z.array(z.string()).meta({
      description: "Plain-language lines, shown as-is.",
      example: ["Damage to your property during the mechanic job, up to the job value", "Injury to the worker while on the job"],
    }),
  })
  .meta({ id: "Quote" });

const apiError = z
  .object({
    error: z.object({
      code: z.string().meta({ example: "INVALID_TRANSITION" }),
      message: z.string().meta({ example: "cannot pay for a job that is PAID_OUT" }),
    }),
  })
  .meta({ id: "Error" });

const configResponse = z.object({ modes }).meta({ id: "Config" });
const resetResponse = z
  .object({ jobId: z.string().meta({ example: "job_3f9c2a1b7d4e5f60" }) })
  .meta({ id: "DemoReset" });

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type JobDocsMatchJobView = Assert<Same<z.output<typeof job>, JobView>>;
export type QuoteDocsMatchQuoteView = Assert<Same<z.output<typeof quote>, QuoteView>>;

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` });
const jsonBody = (id: string) => ({ "application/json": { schema: ref(id) } });
const ok = (description: string, id: string) => ({ description, content: jsonBody(id) });
const fail = (description: string) => ({ description, content: jsonBody("Error") });

const jobIdParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  example: "job_3f9c2a1b7d4e5f60",
};

const notFound = fail("NOT_FOUND: no job with this id.");
const adapterFailed = fail(
  "ADAPTER_ERROR: the provider call failed. The job stays where it was; send the same request again to retry.",
);

const paths = {
  "/api/config": {
    get: {
      tags: ["Demo"],
      summary: "Adapter modes",
      description: "Which adapters run on mock or live right now. Set by PAYMENT_MODE, INSURANCE_MODE, PAYOUT_MODE.",
      responses: { 200: ok("Current modes.", "Config") },
    },
  },
  "/api/demo/reset": {
    post: {
      tags: ["Demo"],
      summary: "Reset demo data",
      description:
        "Deletes everything and restores the seed: customer Tunde (usr_tunde), worker Emeka (usr_emeka, mechanic), " +
        'and a BOOKED "Brake repair" job for ₦15,000. Also re-arms MOCK_FAIL failure drills.',
      responses: { 200: ok("The new seed job id.", "DemoReset") },
    },
  },
  "/api/jobs": {
    post: {
      tags: ["Jobs"],
      summary: "Book a job",
      requestBody: { required: true, content: jsonBody("CreateJobRequest") },
      responses: {
        201: ok("The job, BOOKED.", "Job"),
        400: fail("VALIDATION_ERROR: bad amount (≤ 0, not whole, over the cap), empty title, unknown user or wrong role."),
      },
    },
  },
  "/api/jobs/{id}": {
    get: {
      tags: ["Jobs"],
      summary: "Get a job",
      description: "Full job, including the event timeline and the modes used. Poll this to refresh the UI.",
      parameters: [jobIdParam],
      responses: { 200: ok("The job.", "Job"), 404: notFound },
    },
  },
  "/api/jobs/{id}/quote": {
    post: {
      tags: ["Lifecycle"],
      summary: "Quote job cover",
      description:
        "Gets an insurance quote for a BOOKED job. Status stays BOOKED. Quoting again replaces the previous quote.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The quote.", "Quote"),
        404: notFound,
        409: fail("INVALID_TRANSITION: the job is not BOOKED."),
        502: adapterFailed,
      },
    },
  },
  "/api/jobs/{id}/pay": {
    post: {
      tags: ["Lifecycle"],
      summary: "Pay into escrow and insure",
      description:
        "Collects job amount + premium into escrow (→ ESCROWED), then issues the policy (→ INSURED), in one request. " +
        "Safe to retry: if the policy step failed, retrying only re-runs that step and never charges twice; " +
        "repeating it on an INSURED job returns the job unchanged.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("PayRequest") },
      responses: {
        200: ok("The job, INSURED.", "Job"),
        400: fail("VALIDATION_ERROR: quoteId missing."),
        404: notFound,
        409: fail(
          "QUOTE_REQUIRED: no quote yet. QUOTE_MISMATCH: quoteId is not the latest quote. " +
            "INVALID_TRANSITION: the job is past payment.",
        ),
        502: adapterFailed,
      },
    },
  },
  "/api/jobs/{id}/confirm": {
    post: {
      tags: ["Lifecycle"],
      summary: "Confirm the job is done",
      description:
        "Records one party's confirmation on an INSURED job. The second confirmation moves it to CONFIRMED and " +
        "immediately issues the payout (→ PAID_OUT). Repeat confirmations are no-ops, so a payout is issued at most once. " +
        "If the payout fails the job stays CONFIRMED, and any further confirm retries it.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("ConfirmRequest") },
      responses: {
        200: ok("The job: INSURED after the first confirmation, PAID_OUT after the second.", "Job"),
        400: fail('VALIDATION_ERROR: party is not "customer" or "worker".'),
        404: notFound,
        409: fail("INVALID_TRANSITION: the job is not INSURED/CONFIRMED (for example, a claim was filed)."),
        502: adapterFailed,
      },
    },
  },
  "/api/jobs/{id}/claim": {
    post: {
      tags: ["Lifecycle"],
      summary: "File an insurance claim",
      description: "Files a claim on an INSURED or CONFIRMED job (→ CLAIM_FILED). The payout is then held.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("ClaimRequest") },
      responses: {
        200: ok("The job with its claim.", "Job"),
        400: fail("VALIDATION_ERROR: bad filedBy or reason, or details over 2000 characters."),
        404: notFound,
        409: fail("INVALID_TRANSITION: the job is not INSURED/CONFIRMED, or a claim already exists."),
        502: adapterFailed,
      },
    },
  },
};

/** Builds the OpenAPI 3.1 document served at /openapi.json and rendered at /docs. */
export function openApiDocument(): Record<string, unknown> {
  const registry = z.registry<{ id: string }>();
  const documented = [
    createJobBody,
    payBody,
    confirmBody,
    claimBody,
    job,
    jobStatus,
    jobEvent,
    modes,
    quote,
    apiError,
    configResponse,
    resetResponse,
  ];
  for (const schema of documented) {
    const id = z.globalRegistry.get(schema)?.id;
    if (typeof id !== "string") throw new Error("every documented schema needs .meta({ id })");
    registry.add(schema, { id });
  }
  const { schemas } = z.toJSONSchema(registry, {
    io: "input",
    uri: (id) => `#/components/schemas/${id}`,
    override: ({ jsonSchema }) => {
      // z.number().int() emits ±MAX_SAFE_INTEGER bounds; they are noise in the docs.
      if (jsonSchema.minimum === Number.MIN_SAFE_INTEGER) delete jsonSchema.minimum;
      if (jsonSchema.maximum === Number.MAX_SAFE_INTEGER) delete jsonSchema.maximum;
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "SureJob API",
      version: "0.1.0",
      description: [
        "Proof-of-concept backend for the SureJob job lifecycle: book → quote → pay into escrow → insure → both parties confirm → payout, or file a claim.",
        "",
        "- **Money** is always integer **kobo** (₦1 = 100 kobo).",
        '- **Errors** are always `{ "error": { "code", "message" } }`.',
        "- **Modes**: each provider integration runs on mock or live; every Job reports the modes it actually used.",
        "- **No authentication** in the POC.",
        "",
        "Seed data (restored by `POST /api/demo/reset`): customer `usr_tunde`, worker `usr_emeka`.",
      ].join("\n"),
    },
    tags: [
      { name: "Demo", description: "Configuration and demo controls." },
      { name: "Jobs", description: "Create and read jobs." },
      { name: "Lifecycle", description: "State transitions. Anything out of order returns 409 INVALID_TRANSITION." },
    ],
    paths,
    components: { schemas: stripSchemaKeyword(schemas) },
  };
}

/** Component schemas must not carry `$schema`/`$id`/`id`; OpenAPI names them by their key. */
function stripSchemaKeyword(schemas: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => {
      const { $schema: _dialect, $id: _uri, id: _id, ...rest } = schema as Record<string, unknown>;
      return [name, rest];
    }),
  );
}
