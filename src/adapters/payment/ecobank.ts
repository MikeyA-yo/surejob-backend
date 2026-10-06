import { LiveAdapterNotImplementedError } from "../types.ts";
import type { CollectInput, CollectResult, PaymentAdapter } from "./payment.ts";

/**
 * Live adapter for the Ecobank Local Bank Payment API (sandbox).
 * TODO(integrations): implement against the sandbox once credentials and docs are in;
 * read keys from env only and map the provider reference to `escrowRef`.
 */
export class EcobankPaymentAdapter implements PaymentAdapter {
  readonly mode = "live";

  async collect(_input: CollectInput): Promise<CollectResult> {
    throw new LiveAdapterNotImplementedError("Ecobank payment", "collect", "PAYMENT_MODE");
  }
}
