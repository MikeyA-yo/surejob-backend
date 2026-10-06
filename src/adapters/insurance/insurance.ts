import type { Adapter } from "../types.ts";

export const CLAIM_REASONS = ["damage", "injury", "not_done"] as const;
export type ClaimReason = (typeof CLAIM_REASONS)[number];

export interface QuoteInput {
  valueKobo: number;
  durationDays: number;
  /** Trade of the worker, e.g. "mechanic". */
  category: string;
}

export interface QuoteResult {
  quoteId: string;
  premiumKobo: number;
  /** Plain-language lines, shown as-is in the UI. */
  coverage: string[];
}

export interface IssueInput {
  quoteId: string;
  jobId: string;
}

export interface IssueResult {
  policyRef: string;
}

export interface FileClaimInput {
  policyRef: string;
  reason: ClaimReason;
  details: string;
}

export interface FileClaimResult {
  claimRef: string;
  /** Provider status, e.g. "received". */
  status: string;
}

/** Job cover. Live target: Curacel Grow (Quotations, Orders then Policies, Claims). */
export interface InsuranceAdapter extends Adapter {
  quote(input: QuoteInput): Promise<QuoteResult>;
  issue(input: IssueInput): Promise<IssueResult>;
  fileClaim(input: FileClaimInput): Promise<FileClaimResult>;
}
