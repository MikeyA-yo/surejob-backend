import type { Adapter } from "../types.ts";

export interface IssueTokenInput {
  jobId: string;
  amountKobo: number;
  /** Worker's phone, E.164. */
  phone: string;
}

export interface IssueTokenResult {
  /** Cash-out code shown only on the worker view. */
  code: string;
  ref: string;
  /** ISO 8601. */
  expiresAt: string;
}

/** Pays the worker out as a cash token. Live target: Ecobank XpressCash Token Service. */
export interface PayoutAdapter extends Adapter {
  issueToken(input: IssueTokenInput): Promise<IssueTokenResult>;
}
