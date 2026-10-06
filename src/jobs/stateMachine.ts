import { DomainError } from "../errors.ts";

export const JOB_STATUSES = ["BOOKED", "ESCROWED", "INSURED", "CONFIRMED", "PAID_OUT", "CLAIM_FILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Every status change goes through one of these. Anything not listed is rejected with
 * INVALID_TRANSITION. CONFIRMED is transient: payout fires straight after it.
 */
const TRANSITIONS = {
  quote: { from: ["BOOKED"], to: "BOOKED" },
  collect: { from: ["BOOKED"], to: "ESCROWED" },
  issuePolicy: { from: ["ESCROWED"], to: "INSURED" },
  confirm: { from: ["INSURED"], to: "CONFIRMED" },
  payout: { from: ["CONFIRMED"], to: "PAID_OUT" },
  claim: { from: ["INSURED", "CONFIRMED"], to: "CLAIM_FILED" },
} as const satisfies Record<string, { from: readonly JobStatus[]; to: JobStatus }>;

export type JobAction = keyof typeof TRANSITIONS;

export function canTransition(from: JobStatus, action: JobAction): boolean {
  return (TRANSITIONS[action].from as readonly JobStatus[]).includes(from);
}

/** Returns the target status, or throws INVALID_TRANSITION. */
export function nextStatus(from: JobStatus, action: JobAction): JobStatus {
  if (!canTransition(from, action)) {
    throw new DomainError("INVALID_TRANSITION", `cannot ${action} a job that is ${from}`);
  }
  return TRANSITIONS[action].to;
}
