import { LiveAdapterNotImplementedError } from "../types.ts";
import type { IssueTokenInput, IssueTokenResult, PayoutAdapter } from "./payout.ts";

/**
 * Live adapter for the Ecobank XpressCash Token Service (sandbox).
 * TODO(integrations): implement once the sandbox responds; keys from env only.
 */
export class XpressCashPayoutAdapter implements PayoutAdapter {
  readonly mode = "live";

  async issueToken(_input: IssueTokenInput): Promise<IssueTokenResult> {
    throw new LiveAdapterNotImplementedError("Ecobank XpressCash", "issueToken", "PAYOUT_MODE");
  }
}
