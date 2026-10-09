import { z } from "zod";
import { CLAIM_REASONS } from "../adapters/insurance/insurance.ts";
import { DomainError } from "../errors.ts";

// `.meta()` only feeds the OpenAPI docs (see openapi.ts); it does not affect validation.

const role = z
  .enum(["customer", "worker"], { error: 'must be "customer" or "worker"' })
  .meta({ description: "Account type.", example: "customer" });

/** Accepts "+234 803 000 0002" or "08030000002"-style input; stores digits with an optional leading +. */
const phone = z
  .string()
  .transform((raw) => raw.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?\d{10,15}$/, "must be a phone number with 10 to 15 digits"))
  .meta({ description: "Used for cash-token payouts.", example: "+2348030000002" });

const email = z.string().trim().pipe(z.email("must be a valid email")).meta({ example: "tunde@example.com" });

export const registerBody = z
  .object({
    name: z.string().trim().min(1).max(80).meta({ example: "Tunde" }),
    email,
    password: z.string().min(8, "must be at least 8 characters").max(128).meta({ example: "password123" }),
    role,
    phone,
    trade: z.string().trim().max(60).optional().meta({ description: "Workers: what they do.", example: "mechanic" }),
  })
  .meta({ id: "RegisterRequest" });

export const loginBody = z
  .object({
    email,
    password: z.string().min(1).meta({ example: "password123" }),
  })
  .meta({ id: "LoginRequest" });

export const newWorkerBody = z
  .object({
    name: z.string().trim().min(1).max(80).meta({ example: "Musa" }),
    phone,
    trade: z.string().trim().max(60).optional().meta({ example: "plumber" }),
  })
  .meta({ id: "NewWorker", description: "A worker who is not on SureJob. They are paid by cash token on this phone." });

export const createJobBody = z
  .object({
    title: z.string().trim().min(1).max(120).meta({ example: "Brake repair" }),
    // The upper cap is a business rule and is enforced by the service.
    amountKobo: z
      .number()
      .int("must be a whole number of kobo")
      .positive()
      .meta({ description: "Job price in kobo (₦1 = 100 kobo). Capped at MAX_JOB_AMOUNT_KOBO, ₦500,000 by default.", example: 1_500_000 }),
    workerId: z.string().trim().min(1).optional().meta({ description: "A registered worker (from GET /api/workers).", example: "usr_emeka" }),
    newWorker: newWorkerBody.optional(),
  })
  .refine((body) => (body.workerId === undefined) !== (body.newWorker === undefined), {
    message: "give exactly one of workerId or newWorker",
  })
  .meta({ id: "CreateJobRequest", description: "The customer is the logged-in user. Give workerId or newWorker, not both." });

export const offerBody = z
  .object({
    amountKobo: z
      .number()
      .int("must be a whole number of kobo")
      .positive()
      .meta({ description: "Proposed job price in kobo.", example: 1_800_000 }),
  })
  .meta({ id: "OfferRequest" });

export const payBody = z
  .object({
    quoteId: z.string().trim().min(1).meta({ description: "The quoteId from the latest /quote call.", example: "QTE-7KQ2M9XA" }),
  })
  .meta({ id: "PayRequest" });

export const claimBody = z
  .object({
    reason: z
      .enum(CLAIM_REASONS, { error: `must be one of ${CLAIM_REASONS.join(", ")}` })
      .meta({ description: "damage: property damaged; injury: worker hurt; not_done: job not completed.", example: "damage" }),
    details: z.string().trim().max(2000).default("").meta({ example: "Scratched alloy wheel during the repair" }),
  })
  .meta({ id: "ClaimRequest", description: "Filed by the logged-in user, as the customer or worker of the job." });

/** Parses a request body (missing body = {}), turning schema failures into VALIDATION_ERROR. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const message = result.error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
  throw new DomainError("VALIDATION_ERROR", message);
}
