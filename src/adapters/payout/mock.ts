import type { MockRuntime } from "../mock/runtime.ts";
import { mockRef, numericCode } from "../mock/refs.ts";
import type { IssueTokenInput, IssueTokenResult, PayoutAdapter } from "./payout.ts";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Placeholder shape until the XpressCash sandbox responds: 8-digit code, 24h expiry. */
export class MockPayoutAdapter implements PayoutAdapter {
  readonly mode = "mock";
  readonly #runtime: MockRuntime;
  readonly #now: () => Date;

  constructor(runtime: MockRuntime, now: () => Date = () => new Date()) {
    this.#runtime = runtime;
    this.#now = now;
  }

  async issueToken(_input: IssueTokenInput): Promise<IssueTokenResult> {
    await this.#runtime.simulate("payout");
    return {
      code: numericCode(8),
      ref: mockRef("XPC"),
      expiresAt: new Date(this.#now().getTime() + TOKEN_TTL_MS).toISOString(),
    };
  }
}
