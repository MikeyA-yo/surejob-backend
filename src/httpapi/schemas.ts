import { z } from "zod";
import { CLAIM_REASONS } from "../adapters/insurance/insurance.ts";
import { DomainError } from "../errors.ts";

// `.meta()` only feeds the OpenAPI docs (see openapi.ts); it does not affect validation.

const party = z
  .enum(["customer", "worker"], { error: 'must be "customer" or "worker"' })
  .meta({ description: "Which side of the job is acting." });

export const createJobBody = z
  .object({
    customerId: z.string().trim().min(1).meta({ description: "Id of a user with role customer.", example: "usr_tunde" }),
    workerId: z.string().trim().min(1).meta({ description: "Id of a user with role worker.", example: "usr_emeka" }),
    title: z.string().trim().min(1).max(120).meta({ example: "Brake repair" }),
    // The upper cap is a business rule and is enforced by the service.
    amountKobo: z
      .number()
      .int("must be a whole number of kobo")
      .positive()
      .meta({ description: "Job price in kobo (₦1 = 100 kobo). Capped at MAX_JOB_AMOUNT_KOBO, ₦500,000 by default.", example: 1_500_000 }),
  })
  .meta({ id: "CreateJobRequest" });

export const payBody = z
  .object({
    quoteId: z.string().trim().min(1).meta({ description: "The quoteId from the latest /quote call.", example: "QTE-7KQ2M9XA" }),
  })
  .meta({ id: "PayRequest" });

export const confirmBody = z
  .object({
    party: party.meta({ example: "customer" }),
  })
  .meta({ id: "ConfirmRequest" });

export const claimBody = z
  .object({
    filedBy: party.meta({ example: "customer" }),
    reason: z
      .enum(CLAIM_REASONS, { error: `must be one of ${CLAIM_REASONS.join(", ")}` })
      .meta({ description: "damage: property damaged; injury: worker hurt; not_done: job not completed.", example: "damage" }),
    details: z.string().trim().max(2000).default("").meta({ example: "Scratched alloy wheel during the repair" }),
  })
  .meta({ id: "ClaimRequest" });

/** Parses a request body (missing body = {}), turning schema failures into VALIDATION_ERROR. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const message = result.error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
  throw new DomainError("VALIDATION_ERROR", message);
}
