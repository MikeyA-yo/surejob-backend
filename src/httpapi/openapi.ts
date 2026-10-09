import { z } from "zod";
import { CLAIM_REASONS } from "../adapters/insurance/insurance.ts";
import type { AuthResult } from "../auth/service.ts";
import type { WorkerSummary } from "../jobs/service.ts";
import { JOB_STATUSES } from "../jobs/stateMachine.ts";
import type { JobView, QuoteView } from "../jobs/view.ts";
import { claimBody, createJobBody, loginBody, newWorkerBody, offerBody, payBody, registerBody } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Response schemas. These exist only for the docs; the compile-time checks below
// fail the build if they drift from the real response types.
// ---------------------------------------------------------------------------

const mode = z.enum(["mock", "live"]);
const party = z.enum(["customer", "worker"]);

const modes = z
  .object({ payment: mode, insurance: mode, payout: mode })
  .meta({
    id: "Modes",
    description: 'Per adapter: "mock" (simulated) or "live" (provider sandbox). Show as a Simulated / Sandbox badge.',
  });

const jobStatus = z.enum(JOB_STATUSES).meta({
  id: "JobStatus",
  description:
    "BOOKED → (quote, pay) → ESCROWED → INSURED → (confirmations) → CONFIRMED → PAID_OUT. " +
    "INSURED or CONFIRMED → (claim) → CLAIM_FILED. CONFIRMED is transient: payout fires immediately.",
});

const user = z
  .object({
    id: z.string().meta({ example: "usr_tunde" }),
    name: z.string().meta({ example: "Tunde" }),
    email: z.string().nullable().meta({ example: "tunde@example.com" }),
    role: party,
    phone: z.string().meta({ example: "+2348030000001" }),
    trade: z.string().nullable().meta({ example: null }),
  })
  .meta({ id: "User" });

const authResponse = z
  .object({
    token: z.string().meta({ description: "Send as `Authorization: Bearer <token>`.", example: "eyJhbGciOiJIUzI1NiJ9…" }),
    user,
  })
  .meta({ id: "AuthResponse" });

const workerSummary = z
  .object({
    id: z.string().meta({ example: "usr_emeka" }),
    name: z.string().meta({ example: "Emeka" }),
    trade: z.string().nullable().meta({ example: "mechanic" }),
  })
  .meta({ id: "WorkerSummary" });

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
    premiumKobo: z.number().int().nullable().meta({ description: "Insurance premium; null until quoted.", example: 30_000 }),
    feeKobo: z.number().int().nullable().meta({ description: "SureJob service fee; null until quoted.", example: 37_500 }),
    totalKobo: z
      .number()
      .int()
      .meta({ description: "amountKobo + premiumKobo + feeKobo (unquoted parts count as 0).", example: 1_567_500 }),
    priceAgreed: z.boolean().meta({
      description: "The worker has agreed to amountKobo. Required before quote and pay; always true for off-platform workers.",
    }),
    quoteId: z.string().nullable().meta({ description: "Latest quote; pass it to /pay.", example: "QTE-7KQ2M9XA" }),
    pendingOffer: z
      .object({
        by: party,
        amountKobo: z.number().int().meta({ example: 1_800_000 }),
        at: z.string().meta({ example: "2026-10-09T10:00:00.000Z" }),
      })
      .nullable()
      .meta({
        description:
          "Open price proposal on a BOOKED job with a registered worker. The other side accepts, declines or counters; " +
          "the customer cannot quote or pay while it is open.",
      }),
    customer: z.object({ id: z.string(), name: z.string() }),
    worker: z.object({
      id: z.string(),
      name: z.string(),
      onPlatform: z.boolean().meta({
        description: "false: added by the customer, no account. The customer's confirmation alone releases the payout.",
      }),
    }),
    you: party.meta({ description: "The viewer's side of this job." }),
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
        code: z.string().nullable().meta({
          description:
            "Cash-out code. Only returned to the worker, or to the customer when the worker is not on the platform; otherwise null.",
          example: "47852170",
        }),
        expiresAt: z.string().nullable().meta({ example: "2026-10-10T10:00:00.000Z" }),
        ref: z.string().meta({ example: "XPC-PKS5BEPQ" }),
      })
      .nullable()
      .meta({ description: "Set once PAID_OUT." }),
    modes: modes.meta({ description: "The mode each adapter actually ran in for this job." }),
    events: z.array(jobEvent),
  })
  .meta({ id: "Job" });

const quote = z
  .object({
    quoteId: z.string().meta({ example: "QTE-7KQ2M9XA" }),
    premiumKobo: z.number().int().meta({ description: "Insurance cover.", example: 30_000 }),
    feeKobo: z.number().int().meta({ description: "SureJob service fee.", example: 37_500 }),
    totalKobo: z
      .number()
      .int()
      .meta({ description: "Job amount + premium + fee: what the customer pays into escrow.", example: 1_567_500 }),
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
const resetResponse = z.object({ jobId: z.string().meta({ example: "job_3f9c2a1b7d4e5f60" }) }).meta({ id: "DemoReset" });
const meResponse = z.object({ user }).meta({ id: "Me" });
const workerList = z.object({ workers: z.array(workerSummary) }).meta({ id: "WorkerList" });
const jobList = z.object({ jobs: z.array(job) }).meta({ id: "JobList" });

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type JobDocsMatchJobView = Assert<Same<z.output<typeof job>, JobView>>;
export type QuoteDocsMatchQuoteView = Assert<Same<z.output<typeof quote>, QuoteView>>;
export type AuthDocsMatchAuthResult = Assert<Same<z.output<typeof authResponse>, AuthResult>>;
export type WorkerDocsMatchWorkerSummary = Assert<Same<z.output<typeof workerSummary>, WorkerSummary>>;

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

/** Marks an operation as public (overrides the document-wide bearer requirement). */
const PUBLIC = { security: [] };

const unauthorized = fail("UNAUTHORIZED: missing, invalid or expired token. Log in again.");
const notFound = fail("NOT_FOUND: no job with this id.");
const forbiddenJob = fail("FORBIDDEN: you are not part of this job, or your side of it cannot do this.");
const adapterFailed = fail(
  "ADAPTER_ERROR: the provider call failed. The job stays where it was; send the same request again to retry.",
);

const paths = {
  "/api/config": {
    get: {
      ...PUBLIC,
      tags: ["Demo"],
      summary: "Adapter modes",
      description: "Which adapters run on mock or live right now. Set by PAYMENT_MODE, INSURANCE_MODE, PAYOUT_MODE.",
      responses: { 200: ok("Current modes.", "Config") },
    },
  },
  "/api/demo/reset": {
    post: {
      ...PUBLIC,
      tags: ["Demo"],
      summary: "Reset demo data",
      description:
        "Deletes every user and job and restores the seed: customer Tunde (tunde@example.com) and worker Emeka " +
        '(emeka@example.com, mechanic), both with password "password123", and a BOOKED "Brake repair" job for ₦15,000. ' +
        "Registered accounts are removed too. Also re-arms MOCK_FAIL failure drills.",
      responses: { 200: ok("The new seed job id.", "DemoReset") },
    },
  },
  "/api/auth/register": {
    post: {
      ...PUBLIC,
      tags: ["Auth"],
      summary: "Create an account",
      requestBody: { required: true, content: jsonBody("RegisterRequest") },
      responses: {
        201: ok("Logged in as the new user.", "AuthResponse"),
        400: fail("VALIDATION_ERROR: bad email, short password, bad phone, unknown role."),
        409: fail("EMAIL_TAKEN: an account with this email exists."),
      },
    },
  },
  "/api/auth/login": {
    post: {
      ...PUBLIC,
      tags: ["Auth"],
      summary: "Log in",
      requestBody: { required: true, content: jsonBody("LoginRequest") },
      responses: {
        200: ok("A bearer token and the user.", "AuthResponse"),
        400: fail("VALIDATION_ERROR: email or password missing."),
        401: fail("INVALID_CREDENTIALS: email or password is incorrect."),
      },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user",
      responses: { 200: ok("The logged-in user.", "Me"), 401: unauthorized },
    },
  },
  "/api/workers": {
    get: {
      tags: ["Jobs"],
      summary: "Registered workers",
      description: "Workers with an account, for the booking screen. A worker who is not listed can be added with newWorker.",
      responses: { 200: ok("Workers by name.", "WorkerList"), 401: unauthorized },
    },
  },
  "/api/jobs": {
    get: {
      tags: ["Jobs"],
      summary: "My jobs",
      description: "Jobs where the logged-in user is the customer or the worker, newest first.",
      responses: { 200: ok("The jobs.", "JobList"), 401: unauthorized },
    },
    post: {
      tags: ["Jobs"],
      summary: "Book a job",
      description:
        "Customers only; the logged-in user is the customer. Pass workerId for a registered worker, or newWorker " +
        "(name, phone, trade) to book someone who is not on SureJob: they get an account-less record and are paid by " +
        "cash token on their phone, and the customer's confirmation alone releases the payout.",
      requestBody: { required: true, content: jsonBody("CreateJobRequest") },
      responses: {
        201: ok("The job, BOOKED.", "Job"),
        400: fail(
          "VALIDATION_ERROR: bad amount (≤ 0, not whole, over the cap), empty title, both or neither of workerId/newWorker, " +
            "or workerId is not a worker.",
        ),
        401: unauthorized,
        403: fail("FORBIDDEN: only customers can book."),
      },
    },
  },
  "/api/jobs/{id}": {
    get: {
      tags: ["Jobs"],
      summary: "Get a job",
      description: "Full job, including the event timeline and the modes used. Poll this to refresh the UI.",
      parameters: [jobIdParam],
      responses: { 200: ok("The job.", "Job"), 401: unauthorized, 403: forbiddenJob, 404: notFound },
    },
  },
  "/api/jobs/{id}/offer": {
    post: {
      tags: ["Negotiation"],
      summary: "Propose or counter a price",
      description:
        "Either side of a BOOKED job with a registered worker proposes a new price, or counters the other side's offer. " +
        "The job's price only changes when the other side accepts. Replaces any open offer.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("OfferRequest") },
      responses: {
        200: ok("The job with pendingOffer set.", "Job"),
        400: fail("VALIDATION_ERROR: bad amount, over the cap, or equal to the current price."),
        401: unauthorized,
        403: fail("FORBIDDEN: not part of this job, or the worker has no SureJob account."),
        404: notFound,
        409: fail("INVALID_TRANSITION: the job is already paid for."),
      },
    },
  },
  "/api/jobs/{id}/offer/accept": {
    post: {
      tags: ["Negotiation"],
      summary: "Accept the open offer",
      description:
        "The side that did not make the offer accepts it: it becomes the job's price, and any earlier quote is discarded " +
        "so the customer re-quotes at the new price.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The job at its new price.", "Job"),
        401: unauthorized,
        403: fail("FORBIDDEN: it's your own offer, you're not part of this job, or the worker has no account."),
        404: notFound,
        409: fail("INVALID_TRANSITION: no open offer, or the job is already paid for."),
      },
    },
  },
  "/api/jobs/{id}/agree": {
    post: {
      tags: ["Negotiation"],
      summary: "Worker accepts the current price",
      description:
        "The worker agrees to the job at its current price. A registered worker must agree (here, or by accepting or " +
        "making an offer that is accepted) before the customer can quote and pay. Repeating it is a no-op.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The job with priceAgreed true.", "Job"),
        401: unauthorized,
        403: fail("FORBIDDEN: only the job's worker can do this, or the worker has no account."),
        404: notFound,
        409: fail("OFFER_PENDING: answer the open offer instead. INVALID_TRANSITION: the job is already paid for."),
      },
    },
  },
  "/api/jobs/{id}/offer/decline": {
    post: {
      tags: ["Negotiation"],
      summary: "Decline or withdraw the open offer",
      description: "Clears the open offer; the price stays as it was. Declines the other side's offer, or withdraws your own.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The job with no open offer.", "Job"),
        401: unauthorized,
        403: forbiddenJob,
        404: notFound,
        409: fail("INVALID_TRANSITION: no open offer, or the job is already paid for."),
      },
    },
  },
  "/api/jobs/{id}/quote": {
    post: {
      tags: ["Lifecycle"],
      summary: "Quote job cover and fees",
      description:
        "The job's customer gets the insurance premium and SureJob service fee for a BOOKED job whose price the worker has " +
        "agreed to. Status stays BOOKED. Quoting again replaces the previous quote.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The quote.", "Quote"),
        401: unauthorized,
        403: forbiddenJob,
        404: notFound,
        409: fail(
          "INVALID_TRANSITION: the job is not BOOKED. OFFER_PENDING: answer the open price offer first. " +
            "PRICE_NOT_AGREED: the worker has not accepted the price yet.",
        ),
        502: adapterFailed,
      },
    },
  },
  "/api/jobs/{id}/pay": {
    post: {
      tags: ["Lifecycle"],
      summary: "Pay into escrow and insure",
      description:
        "The job's customer pays job amount + premium into escrow (→ ESCROWED), then the policy is issued (→ INSURED), " +
        "in one request. Safe to retry: if the policy step failed, retrying only re-runs that step and never charges twice; " +
        "repeating it on an INSURED job returns the job unchanged.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("PayRequest") },
      responses: {
        200: ok("The job, INSURED.", "Job"),
        400: fail("VALIDATION_ERROR: quoteId missing."),
        401: unauthorized,
        403: forbiddenJob,
        404: notFound,
        409: fail(
          "QUOTE_REQUIRED: no quote yet (or the price changed since). QUOTE_MISMATCH: quoteId is not the latest quote. " +
            "OFFER_PENDING: answer the open price offer first. PRICE_NOT_AGREED: the worker has not accepted the price. " +
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
        "Records the logged-in user's confirmation (as customer or worker of the job); no body needed. When both have " +
        "confirmed the job moves to CONFIRMED and the payout is issued immediately (→ PAID_OUT). If the worker is not on " +
        "the platform, the customer's confirmation alone does this. Repeat confirmations are no-ops, so a payout is issued " +
        "at most once. If the payout fails the job stays CONFIRMED, and any further confirm retries it.",
      parameters: [jobIdParam],
      responses: {
        200: ok("The job: INSURED after a first confirmation, PAID_OUT once complete.", "Job"),
        401: unauthorized,
        403: forbiddenJob,
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
      description:
        "Files a claim, as the logged-in user's side of the job, on an INSURED or CONFIRMED job (→ CLAIM_FILED). The payout is then held.",
      parameters: [jobIdParam],
      requestBody: { required: true, content: jsonBody("ClaimRequest") },
      responses: {
        200: ok("The job with its claim.", "Job"),
        400: fail("VALIDATION_ERROR: bad reason, or details over 2000 characters."),
        401: unauthorized,
        403: forbiddenJob,
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
    registerBody,
    loginBody,
    createJobBody,
    newWorkerBody,
    offerBody,
    payBody,
    claimBody,
    user,
    authResponse,
    meResponse,
    workerSummary,
    workerList,
    job,
    jobList,
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
      version: "0.2.0",
      description: [
        "Proof-of-concept backend for the SureJob job lifecycle: book → quote → pay into escrow → insure → confirm → payout, or file a claim.",
        "",
        "- **Auth**: log in with `POST /api/auth/login`, then send `Authorization: Bearer <token>` (use **Authorize** above).",
        '  Demo accounts: `tunde@example.com` (customer) and `emeka@example.com` (worker), password `password123`.',
        "- **Money** is always integer **kobo** (₦1 = 100 kobo).",
        '- **Errors** are always `{ "error": { "code", "message" } }`.',
        "- **Modes**: each provider integration runs on mock or live; every Job reports the modes it actually used.",
        "- **Off-platform workers**: a customer can book someone with no SureJob account by passing `newWorker`.",
      ].join("\n"),
    },
    tags: [
      { name: "Auth", description: "Accounts and sessions." },
      { name: "Demo", description: "Configuration and demo controls (no login needed)." },
      { name: "Jobs", description: "Create and read jobs." },
      { name: "Negotiation", description: "Bargaining over the price before payment (registered workers only)." },
      { name: "Lifecycle", description: "State transitions. Anything out of order returns 409 INVALID_TRANSITION." },
    ],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: stripSchemaKeyword(schemas),
    },
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
