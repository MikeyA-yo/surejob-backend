import type { EcobankConfig } from "../config.ts";
import type { Logger } from "../logger.ts";
import type { Modes } from "./types.ts";
import type { MockRuntime } from "./mock/runtime.ts";
import type { PaymentAdapter } from "./payment/payment.ts";
import type { InsuranceAdapter } from "./insurance/insurance.ts";
import type { PayoutAdapter } from "./payout/payout.ts";
import { EcobankClient } from "./ecobank/client.ts";
import { EcobankTokenProvider } from "./ecobank/tokenProvider.ts";
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

export interface CreateAdaptersOptions {
  modes: Modes;
  mockRuntime: MockRuntime;
  logger: Logger;
  /** Required when payout is live. */
  ecobank?: EcobankConfig | null;
}

/** Picks mock or live per adapter. The switch is config only; there is no runtime fallback. */
export function createAdapters({ modes, mockRuntime, logger, ecobank }: CreateAdaptersOptions): Adapters {
  return {
    payment: modes.payment === "live" ? new EcobankPaymentAdapter() : new MockPaymentAdapter(mockRuntime),
    insurance: modes.insurance === "live" ? new CuracelInsuranceAdapter() : new MockInsuranceAdapter(mockRuntime),
    payout: modes.payout === "live" ? livePayout(requireEcobank(ecobank, "PAYOUT_MODE"), logger) : new MockPayoutAdapter(mockRuntime),
  };
}

function livePayout(config: EcobankConfig, logger: Logger): PayoutAdapter {
  return new XpressCashPayoutAdapter(ecobankClient(config, "payout", logger), config);
}

export function adapterModes(adapters: Adapters): Modes {
  return { payment: adapters.payment.mode, insurance: adapters.insurance.mode, payout: adapters.payout.mode };
}

/** One client per Ecobank service, since access tokens are scoped to a serviceCode. */
function ecobankClient(config: EcobankConfig, service: "payment" | "payout", logger: Logger): EcobankClient {
  const serviceCode = service === "payment" ? config.paymentServiceCode : config.payoutServiceCode;
  const tokens = new EcobankTokenProvider({ config, serviceCode, logger });
  return new EcobankClient({ config, tokens });
}

function requireEcobank(config: EcobankConfig | null | undefined, modeVar: string): EcobankConfig {
  if (!config) throw new Error(`${modeVar}=live needs the ECOBANK_* settings`);
  return config;
}
