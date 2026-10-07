import type { Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import type { JobRecord, UserRecord } from "../store/types.ts";
import type { JobStatus } from "./stateMachine.ts";

/** The Job shape from the API contract (PRD section 5), plus `quoteId` so a reloaded UI can still pay. */
export interface JobView {
  id: string;
  title: string;
  status: JobStatus;
  amountKobo: number;
  /** null until quoted. */
  premiumKobo: number | null;
  /** amountKobo + premiumKobo (premium counts as 0 until quoted). */
  totalKobo: number;
  quoteId: string | null;
  customer: { id: string; name: string };
  worker: { id: string; name: string };
  confirmations: { customer: boolean; worker: boolean };
  escrowRef: string | null;
  policyRef: string | null;
  claim: { ref: string; status: string; reason: ClaimReason } | null;
  /** Set once paid out. code/expiresAt are always present on mock; live XpressCash may not return them. */
  payout: { code: string | null; expiresAt: string | null; ref: string } | null;
  /** The mode each adapter actually ran in for this job. */
  modes: Modes;
  events: { type: string; at: string; detail: string }[];
}

export interface QuoteView {
  quoteId: string;
  premiumKobo: number;
  totalKobo: number;
  coverage: string[];
}

export function toJobView(job: JobRecord, customer: UserRecord, worker: UserRecord): JobView {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    amountKobo: job.amountKobo,
    premiumKobo: job.premiumKobo,
    totalKobo: job.amountKobo + (job.premiumKobo ?? 0),
    quoteId: job.quoteId,
    customer: { id: customer.id, name: customer.name },
    worker: { id: worker.id, name: worker.name },
    confirmations: {
      customer: job.customerConfirmedAt !== null,
      worker: job.workerConfirmedAt !== null,
    },
    escrowRef: job.escrowRef,
    policyRef: job.policyRef,
    claim: job.claim ? { ref: job.claim.ref, status: job.claim.status, reason: job.claim.reason } : null,
    payout:
      job.payoutRef !== null ? { code: job.payoutCode, expiresAt: job.payoutExpiresAt, ref: job.payoutRef } : null,
    modes: job.modes,
    events: job.events.map((e) => ({ type: e.type, at: e.at, detail: e.detail })),
  };
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

/** 1_500_000 → "₦15,000.00". Display only; money is always stored as integer kobo. */
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}
