import { randomInt } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

/** Points where MOCK_FAIL can inject a one-shot failure, to rehearse recovery during the demo. */
export const FAILURE_POINTS = ["quote", "pay", "issue", "payout", "claim"] as const;
export type FailurePoint = (typeof FAILURE_POINTS)[number];

export interface MockRuntimeOptions {
  latency: { minMs: number; maxMs: number };
  failOnce: readonly FailurePoint[];
}

export class SimulatedFailureError extends Error {
  constructor(point: FailurePoint) {
    super(`simulated failure (MOCK_FAIL=${point})`);
    this.name = "SimulatedFailureError";
  }
}

/** Shared by all mock adapters: adds realistic latency and fires armed failures once. */
export class MockRuntime {
  readonly #latency: MockRuntimeOptions["latency"];
  readonly #configuredFailures: readonly FailurePoint[];
  #armed: Set<FailurePoint>;

  constructor(options: MockRuntimeOptions) {
    this.#latency = options.latency;
    this.#configuredFailures = options.failOnce;
    this.#armed = new Set(options.failOnce);
  }

  /** Waits the configured latency, then throws if a failure is armed for this point. */
  async simulate(point: FailurePoint): Promise<void> {
    const { minMs, maxMs } = this.#latency;
    const delay = maxMs > minMs ? randomInt(minMs, maxMs + 1) : minMs;
    if (delay > 0) await sleep(delay);
    if (this.#armed.delete(point)) throw new SimulatedFailureError(point);
  }

  /** Re-arms the MOCK_FAIL points so a rehearsal can be repeated without a restart. */
  rearm(): void {
    this.#armed = new Set(this.#configuredFailures);
  }
}
