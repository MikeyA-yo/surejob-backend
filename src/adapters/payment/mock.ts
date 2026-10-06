import type { MockRuntime } from "../mock/runtime.ts";
import { mockRef } from "../mock/refs.ts";
import type { CollectInput, CollectResult, PaymentAdapter } from "./payment.ts";

export class MockPaymentAdapter implements PaymentAdapter {
  readonly mode = "mock";
  readonly #runtime: MockRuntime;

  constructor(runtime: MockRuntime) {
    this.#runtime = runtime;
  }

  async collect(_input: CollectInput): Promise<CollectResult> {
    await this.#runtime.simulate("pay");
    return { escrowRef: mockRef("ESC") };
  }
}
