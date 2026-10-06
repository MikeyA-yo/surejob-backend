import type { Modes } from "./types.ts";
import type { MockRuntime } from "./mock/runtime.ts";
import type { PaymentAdapter } from "./payment/payment.ts";
import type { InsuranceAdapter } from "./insurance/insurance.ts";
import type { PayoutAdapter } from "./payout/payout.ts";
import { MockPaymentAdapter } from "./payment/mock.ts";
import { EcobankPaymentAdapter } from "./payment/ecobank.ts";
import { MockInsuranceAdapter } from "./insurance/mock.ts";
import { CuracelInsuranceAdapter } from "./insurance/curacel.ts";
import { MockPayoutAdapter } from "./payout/mock.ts";
import { XpressCashPayoutAdapter } from "./payout/xpresscash.ts";

export interface Adapters {
  payment: PaymentAdapter;
  insurance: InsuranceAdapter;
  payout: PayoutAdapter;
}

/** Picks mock or live per adapter. The switch is config only; there is no runtime fallback. */
export function createAdapters(modes: Modes, mockRuntime: MockRuntime): Adapters {
  return {
    payment: modes.payment === "live" ? new EcobankPaymentAdapter() : new MockPaymentAdapter(mockRuntime),
    insurance: modes.insurance === "live" ? new CuracelInsuranceAdapter() : new MockInsuranceAdapter(mockRuntime),
    payout: modes.payout === "live" ? new XpressCashPayoutAdapter() : new MockPayoutAdapter(mockRuntime),
  };
}

export function adapterModes(adapters: Adapters): Modes {
  return { payment: adapters.payment.mode, insurance: adapters.insurance.mode, payout: adapters.payout.mode };
}
