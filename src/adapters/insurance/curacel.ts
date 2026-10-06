import { LiveAdapterNotImplementedError } from "../types.ts";
import type {
  FileClaimInput,
  FileClaimResult,
  InsuranceAdapter,
  IssueInput,
  IssueResult,
  QuoteInput,
  QuoteResult,
} from "./insurance.ts";

/**
 * Live adapter for Curacel Grow (sandbox).
 * TODO(integrations): quote → Quotations; issue → Orders then Policies; fileClaim → Claims.
 * Keys from env only. Results must match the mock's shape exactly.
 */
export class CuracelInsuranceAdapter implements InsuranceAdapter {
  readonly mode = "live";

  async quote(_input: QuoteInput): Promise<QuoteResult> {
    throw new LiveAdapterNotImplementedError("Curacel", "quote", "INSURANCE_MODE");
  }

  async issue(_input: IssueInput): Promise<IssueResult> {
    throw new LiveAdapterNotImplementedError("Curacel", "issue", "INSURANCE_MODE");
  }

  async fileClaim(_input: FileClaimInput): Promise<FileClaimResult> {
    throw new LiveAdapterNotImplementedError("Curacel", "fileClaim", "INSURANCE_MODE");
  }
}
