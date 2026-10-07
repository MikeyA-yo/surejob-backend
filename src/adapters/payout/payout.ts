import type { Adapter } from "../types.ts";

export interface IssueTokenInput {
  jobId: string;
  amountKobo: number;
  /** Worker's phone, E.164. */
  phone: string;
}

export interface IssueTokenResult {
  /**
   * Cash-out code shown only on the worker view. null when the provider does not return it
   * (XpressCash's documented response has none; the code reaches the receiver another way).
   */
  code: string | null;
  ref: string;
  /** ISO 8601, or null when the provider does not say. */
  expiresAt: string | null;
}

/** Pays the worker out as a cash token. Live target: Ecobank XpressCash Token Service. */
export interface PayoutAdapter extends Adapter {
  issueToken(input: IssueTokenInput): Promise<IssueTokenResult>;
}
