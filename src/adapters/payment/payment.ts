import type { Adapter } from "../types.ts";

export interface CollectInput {
  /** Our job id, also used as the provider-side idempotency reference. */
  jobId: string;
  amountKobo: number;
}

export interface CollectResult {
  escrowRef: string;
}

/** Collects the customer's payment (job amount + premium) into escrow. Live target: Ecobank Local Bank Payment API. */
export interface PaymentAdapter extends Adapter {
  collect(input: CollectInput): Promise<CollectResult>;
}
