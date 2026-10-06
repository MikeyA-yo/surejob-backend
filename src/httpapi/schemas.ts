import { z } from "zod";
import { CLAIM_REASONS } from "../adapters/insurance/insurance.ts";
import { DomainError } from "../errors.ts";

const party = z.enum(["customer", "worker"], { error: 'must be "customer" or "worker"' });

export const createJobBody = z.object({
  customerId: z.string().trim().min(1),
  workerId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  // The upper cap is a business rule and is enforced by the service.
  amountKobo: z.number().int("must be a whole number of kobo").positive(),
});

export const payBody = z.object({
  quoteId: z.string().trim().min(1),
});

export const confirmBody = z.object({
  party,
});

export const claimBody = z.object({
  filedBy: party,
  reason: z.enum(CLAIM_REASONS, { error: `must be one of ${CLAIM_REASONS.join(", ")}` }),
  details: z.string().trim().max(2000).default(""),
});

/** Parses a request body (missing body = {}), turning schema failures into VALIDATION_ERROR. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  const message = result.error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
  throw new DomainError("VALIDATION_ERROR", message);
}
