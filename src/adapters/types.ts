export type AdapterMode = "mock" | "live";

export type AdapterName = "payment" | "insurance" | "payout";

export type Modes = Record<AdapterName, AdapterMode>;

/** Every adapter reports which mode it runs in, so the UI can badge results as Sandbox or Simulated. */
export interface Adapter {
  readonly mode: AdapterMode;
}

/**
 * Thrown by live adapters whose provider integration has not been written yet.
 * There is deliberately no fallback to the mock: the operator flips the mode env var instead.
 */
export class LiveAdapterNotImplementedError extends Error {
  constructor(provider: string, operation: string, modeEnvVar: string) {
    super(`${provider} ${operation} is not implemented yet; set ${modeEnvVar}=mock to use the simulator`);
    this.name = "LiveAdapterNotImplementedError";
  }
}
