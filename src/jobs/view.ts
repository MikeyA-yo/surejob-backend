import type { AdapterMode, Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import type { ClaimRow, EventRow, JobRow, UserRow } from "../store/store.ts";
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

export function toJobView(
  job: JobRow,
  customer: UserRow,
  worker: UserRow,
  claim: ClaimRow | undefined,
  events: EventRow[],
): JobView {
  const premium = job.premium_kobo;
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    amountKobo: job.amount_kobo,
    premiumKobo: premium,
    totalKobo: job.amount_kobo + (premium ?? 0),
    quoteId: job.quote_id,
    customer: { id: customer.id, name: customer.name },
    worker: { id: worker.id, name: worker.name },
    confirmations: {
      customer: job.customer_confirmed_at !== null,
      worker: job.worker_confirmed_at !== null,
    },
    escrowRef: job.escrow_ref,
    policyRef: job.policy_ref,
    claim: claim ? { ref: claim.ref, status: claim.status, reason: claim.reason } : null,
    payout:
      job.payout_ref !== null
        ? { code: job.payout_code, expiresAt: job.payout_expires_at, ref: job.payout_ref }
        : null,
    modes: parseModes(job.modes_json),
    events: events.map((e) => ({ type: e.type, at: e.created_at, detail: e.detail })),
  };
}

export function parseModes(json: string): Modes {
  const raw = JSON.parse(json) as Partial<Record<keyof Modes, unknown>>;
  const mode = (value: unknown): AdapterMode => (value === "live" ? "live" : "mock");
  return { payment: mode(raw.payment), insurance: mode(raw.insurance), payout: mode(raw.payout) };
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

/** 1_500_000 → "₦15,000.00". Display only; money is always stored as integer kobo. */
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}
