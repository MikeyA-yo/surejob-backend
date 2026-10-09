import type { Modes } from "../adapters/types.ts";
import type { ClaimReason } from "../adapters/insurance/insurance.ts";
import type { JobRecord, Party, UserRecord } from "../store/types.ts";
import type { JobStatus } from "./stateMachine.ts";

/**
 * The Job shape from the API contract (PRD section 5), plus `quoteId` (a reloaded UI can still pay),
 * `you` (which side the viewer is) and `worker.onPlatform`.
 */
export interface JobView {
  id: string;
  title: string;
  status: JobStatus;
  amountKobo: number;
  /** Insurance premium; null until quoted. */
  premiumKobo: number | null;
  /** SureJob service fee; null until quoted. */
  feeKobo: number | null;
  /** amountKobo + premiumKobo + feeKobo (unquoted parts count as 0). */
  totalKobo: number;
  /** Whether the worker has agreed to amountKobo. Always true for a worker who is not on the platform. */
  priceAgreed: boolean;
  quoteId: string | null;
  customer: { id: string; name: string };
  /** An open price proposal (BOOKED jobs with a registered worker); the job's price changes only when the other side accepts. */
  pendingOffer: { by: Party; amountKobo: number; at: string } | null;
  /** onPlatform false: added by the customer, has no account; the customer's confirmation releases payout. */
  worker: { id: string; name: string; onPlatform: boolean };
  /** The viewer's side of this job. */
  you: Party;
  confirmations: { customer: boolean; worker: boolean };
  escrowRef: string | null;
  policyRef: string | null;
  claim: { ref: string; status: string; reason: ClaimReason } | null;
  /**
   * Set once paid out. `code` is only shown to the worker, or to the customer when the worker is not on
   * the platform (they pass it on); otherwise null. Live XpressCash may not return code/expiresAt.
   */
  payout: { code: string | null; expiresAt: string | null; ref: string } | null;
  /** The mode each adapter actually ran in for this job. */
  modes: Modes;
  events: { type: string; at: string; detail: string }[];
}

export interface QuoteView {
  quoteId: string;
  /** Insurance premium. */
  premiumKobo: number;
  /** SureJob service fee. */
  feeKobo: number;
  totalKobo: number;
  coverage: string[];
}

export interface UserView {
  id: string;
  name: string;
  email: string | null;
  role: Party;
  phone: string;
  trade: string | null;
}

export function toUserView(user: UserRecord): UserView {
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, trade: user.trade };
}

export function isOnPlatform(user: UserRecord): boolean {
  return user.email !== null;
}

export function toJobView(job: JobRecord, customer: UserRecord, worker: UserRecord, viewer: Party): JobView {
  const workerOnPlatform = isOnPlatform(worker);
  const canSeeCode = viewer === "worker" || !workerOnPlatform;
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    amountKobo: job.amountKobo,
    premiumKobo: job.premiumKobo,
    feeKobo: job.feeKobo,
    totalKobo: job.amountKobo + (job.premiumKobo ?? 0) + (job.feeKobo ?? 0),
    priceAgreed: !workerOnPlatform || job.agreedAmountKobo === job.amountKobo,
    quoteId: job.quoteId,
    pendingOffer: job.pendingOffer,
    customer: { id: customer.id, name: customer.name },
    worker: { id: worker.id, name: worker.name, onPlatform: workerOnPlatform },
    you: viewer,
    confirmations: {
      customer: job.customerConfirmedAt !== null,
      worker: job.workerConfirmedAt !== null,
    },
    escrowRef: job.escrowRef,
    policyRef: job.policyRef,
    claim: job.claim ? { ref: job.claim.ref, status: job.claim.status, reason: job.claim.reason } : null,
    payout:
      job.payoutRef !== null
        ? { code: canSeeCode ? job.payoutCode : null, expiresAt: job.payoutExpiresAt, ref: job.payoutRef }
        : null,
    modes: job.modes,
    events: job.events.map((e) => ({ type: e.type, at: e.at, detail: e.detail })),
  };
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

/** 1_500_000 → "₦15,000.00". Display only; money is always stored as integer kobo. */
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}
