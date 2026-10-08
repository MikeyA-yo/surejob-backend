import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockPremiumKobo } from "../src/adapters/insurance/mock.ts";
import { loadConfig } from "../src/config.ts";
import { DomainError } from "../src/errors.ts";
import { JOB_STATUSES, canTransition, nextStatus } from "../src/jobs/stateMachine.ts";

describe("state machine", () => {
  it("allows exactly the PRD transitions", () => {
    const allowed = JOB_STATUSES.flatMap((from) =>
      (["quote", "collect", "issuePolicy", "confirm", "payout", "claim"] as const)
        .filter((action) => canTransition(from, action))
        .map((action) => `${from} -${action}-> ${nextStatus(from, action)}`),
    );
    assert.deepEqual(allowed.sort(), [
      "BOOKED -collect-> ESCROWED",
      "BOOKED -quote-> BOOKED",
      "CONFIRMED -claim-> CLAIM_FILED",
      "CONFIRMED -payout-> PAID_OUT",
      "ESCROWED -issuePolicy-> INSURED",
      "INSURED -claim-> CLAIM_FILED",
      "INSURED -confirm-> CONFIRMED",
    ]);
  });

  it("throws INVALID_TRANSITION otherwise", () => {
    assert.throws(
      () => nextStatus("PAID_OUT", "claim"),
      (err) => err instanceof DomainError && err.code === "INVALID_TRANSITION",
    );
  });
});

describe("mock premium", () => {
  it("is 2% of value, at least ₦200, rounded up to ₦50", () => {
    assert.equal(mockPremiumKobo(1_500_000), 30_000); // ₦15,000 → ₦300
    assert.equal(mockPremiumKobo(500_000), 20_000); // ₦100 → minimum ₦200
    assert.equal(mockPremiumKobo(1_510_000), 35_000); // ₦302 → ₦350
    assert.equal(mockPremiumKobo(50_000_000), 1_000_000); // ₦500,000 → ₦10,000
  });
});

describe("config", () => {
  it("defaults to mock everything", () => {
    const config = loadConfig({});
    assert.deepEqual(config.modes, { payment: "mock", insurance: "mock", payout: "mock" });
    assert.deepEqual(config.mock.latency, { minMs: 300, maxMs: 800 });
    assert.deepEqual(config.mock.failOnce, []);
    assert.equal(config.jobs.maxAmountKobo, 50_000_000);
  });

  it("parses modes, latency and failure drills", () => {
    const config = loadConfig({ INSURANCE_MODE: "live", MOCK_LATENCY_MS: "0", MOCK_FAIL: "pay, Payout" });
    assert.equal(config.modes.insurance, "live");
    assert.deepEqual(config.mock.latency, { minMs: 0, maxMs: 0 });
    assert.deepEqual(config.mock.failOnce, ["pay", "payout"]);
  });

  it("rejects bad values with a readable message", () => {
    assert.throws(() => loadConfig({ PAYMENT_MODE: "sandbox" }), /PAYMENT_MODE/);
    assert.throws(() => loadConfig({ MOCK_FAIL: "everything" }), /MOCK_FAIL/);
    assert.throws(() => loadConfig({ MOCK_LATENCY_MS: "800-300" }), /MOCK_LATENCY_MS/);
  });
});
