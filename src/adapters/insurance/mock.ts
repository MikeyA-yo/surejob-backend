import type { MockRuntime } from "../mock/runtime.ts";
import { mockRef } from "../mock/refs.ts";
import type {
  FileClaimInput,
  FileClaimResult,
  InsuranceAdapter,
  IssueInput,
  IssueResult,
  QuoteInput,
  QuoteResult,
} from "./insurance.ts";

const PREMIUM_RATE_PERCENT = 2;
const MIN_PREMIUM_KOBO = 20_000; // ₦200
const PREMIUM_STEP_KOBO = 5_000; // ₦50

/** Illustrative pricing: 2% of job value, minimum ₦200, rounded up to the next ₦50. */
export function mockPremiumKobo(valueKobo: number): number {
  const raw = Math.max(Math.ceil((valueKobo * PREMIUM_RATE_PERCENT) / 100), MIN_PREMIUM_KOBO);
  return Math.ceil(raw / PREMIUM_STEP_KOBO) * PREMIUM_STEP_KOBO;
}

export class MockInsuranceAdapter implements InsuranceAdapter {
  readonly mode = "mock";
  readonly #runtime: MockRuntime;

  constructor(runtime: MockRuntime) {
    this.#runtime = runtime;
  }

  async quote(input: QuoteInput): Promise<QuoteResult> {
    await this.#runtime.simulate("quote");
    return {
      quoteId: mockRef("QTE"),
      premiumKobo: mockPremiumKobo(input.valueKobo),
      coverage: [
        `Damage to your property during the ${input.category} job, up to the job value`,
        "Injury to the worker while on the job",
        "Refund if the job is not done",
        `Cover lasts ${input.durationDays} days from payment`,
      ],
    };
  }

  async issue(_input: IssueInput): Promise<IssueResult> {
    await this.#runtime.simulate("issue");
    return { policyRef: mockRef("POL") };
  }

  async fileClaim(_input: FileClaimInput): Promise<FileClaimResult> {
    await this.#runtime.simulate("claim");
    return { claimRef: mockRef("CLM"), status: "received" };
  }
}
