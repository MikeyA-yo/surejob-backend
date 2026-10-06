import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { JobView } from "../src/jobs/view.ts";
import { eventTypes, insuredJob, SEED_BOOKING, startTestServer, type TestServer } from "./helpers.ts";

let api: TestServer;

afterEach(async () => {
  await api?.close();
});

describe("happy path", () => {
  it("books, quotes, pays, confirms twice and issues one payout", async () => {
    api = await startTestServer();

    const booked = await api.request<JobView>("POST", "/api/jobs", SEED_BOOKING);
    assert.equal(booked.status, 201);
    assert.equal(booked.body.status, "BOOKED");
    assert.equal(booked.body.premiumKobo, null);
    assert.deepEqual(booked.body.customer, { id: "usr_tunde", name: "Tunde" });
    const id = booked.body.id;

    const quote = await api.request("POST", `/api/jobs/${id}/quote`);
    assert.equal(quote.status, 200);
    assert.match(quote.body.quoteId, /^QTE-/);
    assert.equal(quote.body.premiumKobo, 30_000); // 2% of ₦15,000 = ₦300
    assert.equal(quote.body.totalKobo, 1_530_000);
    assert.ok(quote.body.coverage.every((line: unknown) => typeof line === "string"));

    const paid = await api.request<JobView>("POST", `/api/jobs/${id}/pay`, { quoteId: quote.body.quoteId });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, "INSURED");
    assert.match(paid.body.escrowRef!, /^ESC-/);
    assert.match(paid.body.policyRef!, /^POL-/);

    const first = await api.request<JobView>("POST", `/api/jobs/${id}/confirm`, { party: "customer" });
    assert.equal(first.body.status, "INSURED");
    assert.deepEqual(first.body.confirmations, { customer: true, worker: false });
    assert.equal(first.body.payout, null);

    const second = await api.request<JobView>("POST", `/api/jobs/${id}/confirm`, { party: "worker" });
    assert.equal(second.body.status, "PAID_OUT");
    assert.match(second.body.payout!.code, /^\d{8}$/);
    assert.ok(Date.parse(second.body.payout!.expiresAt) > Date.now());

    for (const party of ["worker", "customer"]) {
      const again = await api.request<JobView>("POST", `/api/jobs/${id}/confirm`, { party });
      assert.equal(again.status, 200);
      assert.deepEqual(again.body.payout, second.body.payout);
    }

    const final = await api.request<JobView>("GET", `/api/jobs/${id}`);
    assert.deepEqual(eventTypes(final.body), [
      "job.booked",
      "quote.issued",
      "payment.escrowed",
      "policy.issued",
      "confirmation.recorded",
      "confirmation.recorded",
      "job.confirmed",
      "payout.issued",
    ]);
    assert.ok(!final.body.events.some((e) => e.detail.includes(second.body.payout!.code)), "code must not leak into the timeline");
    assert.deepEqual(final.body.modes, { payment: "mock", insurance: "mock", payout: "mock" });
  });

  it("files a claim from INSURED and holds the payout", async () => {
    api = await startTestServer();
    const job = await insuredJob(api);

    const claimed = await api.request<JobView>("POST", `/api/jobs/${job.id}/claim`, {
      filedBy: "customer",
      reason: "damage",
      details: "Scratched wheel",
    });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.status, "CLAIM_FILED");
    assert.match(claimed.body.claim!.ref, /^CLM-/);
    assert.deepEqual({ ...claimed.body.claim, ref: "x" }, { ref: "x", status: "received", reason: "damage" });

    const confirm = await api.request("POST", `/api/jobs/${job.id}/confirm`, { party: "customer" });
    assert.equal(confirm.status, 409);
    assert.equal(confirm.body.error.code, "INVALID_TRANSITION");

    const again = await api.request("POST", `/api/jobs/${job.id}/claim`, { filedBy: "worker", reason: "injury" });
    assert.equal(again.status, 409);
  });
});

describe("state machine enforcement", () => {
  it("rejects pay before a quote", async () => {
    api = await startTestServer();
    const res = await api.request("POST", `/api/jobs/${api.seedJobId}/pay`, { quoteId: "QTE-NOPE" });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "QUOTE_REQUIRED");
  });

  it("rejects pay with a stale quote id", async () => {
    api = await startTestServer();
    const id = api.seedJobId;
    const first = await api.request("POST", `/api/jobs/${id}/quote`);
    await api.request("POST", `/api/jobs/${id}/quote`);
    const res = await api.request("POST", `/api/jobs/${id}/pay`, { quoteId: first.body.quoteId });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "QUOTE_MISMATCH");
  });

  it("rejects out-of-order transitions with INVALID_TRANSITION", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    for (const [path, body] of [
      ["confirm", { party: "customer" }],
      ["claim", { filedBy: "customer", reason: "damage" }],
    ] as const) {
      const res = await api.request("POST", `/api/jobs/${id}/${path}`, body);
      assert.equal(res.status, 409, path);
      assert.equal(res.body.error.code, "INVALID_TRANSITION");
    }

    const job = await insuredJob(api);
    const requote = await api.request("POST", `/api/jobs/${job.id}/quote`);
    assert.equal(requote.status, 409);
    assert.equal(requote.body.error.code, "INVALID_TRANSITION");
  });
});

describe("idempotency and recovery", () => {
  it("retrying pay after a failed policy step does not charge twice", async () => {
    api = await startTestServer({ failOnce: ["issue"] });
    const { body: job } = await api.request<JobView>("POST", "/api/jobs", SEED_BOOKING);
    const { body: quote } = await api.request("POST", `/api/jobs/${job.id}/quote`);

    const failed = await api.request("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
    assert.equal(failed.status, 502);
    assert.equal(failed.body.error.code, "ADAPTER_ERROR");
    const escrowed = await api.request<JobView>("GET", `/api/jobs/${job.id}`);
    assert.equal(escrowed.body.status, "ESCROWED");

    const retried = await api.request<JobView>("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
    assert.equal(retried.status, 200);
    assert.equal(retried.body.status, "INSURED");
    assert.equal(retried.body.escrowRef, escrowed.body.escrowRef);
    assert.equal(eventTypes(retried.body).filter((t) => t === "payment.escrowed").length, 1);
    assert.ok(eventTypes(retried.body).includes("insurance.issue.failed"));

    const replay = await api.request<JobView>("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
    assert.equal(replay.status, 200);
    assert.deepEqual(replay.body, retried.body);
  });

  it("concurrent pay requests collect exactly once", async () => {
    api = await startTestServer({ latencyMs: 20 });
    const id = api.seedJobId;
    const { body: quote } = await api.request("POST", `/api/jobs/${id}/quote`);

    const results = await Promise.all(
      Array.from({ length: 3 }, () => api.request<JobView>("POST", `/api/jobs/${id}/pay`, { quoteId: quote.quoteId })),
    );
    assert.ok(results.every((r) => r.status === 200 && r.body.status === "INSURED"));
    const final = await api.request<JobView>("GET", `/api/jobs/${id}`);
    assert.equal(eventTypes(final.body).filter((t) => t === "payment.escrowed").length, 1);
  });

  it("a failed payout leaves the job CONFIRMED and the next confirm retries it", async () => {
    api = await startTestServer({ failOnce: ["payout"] });
    const job = await insuredJob(api);
    await api.request("POST", `/api/jobs/${job.id}/confirm`, { party: "customer" });

    const failed = await api.request("POST", `/api/jobs/${job.id}/confirm`, { party: "worker" });
    assert.equal(failed.status, 502);
    const confirmed = await api.request<JobView>("GET", `/api/jobs/${job.id}`);
    assert.equal(confirmed.body.status, "CONFIRMED");
    assert.equal(confirmed.body.payout, null);

    const retried = await api.request<JobView>("POST", `/api/jobs/${job.id}/confirm`, { party: "worker" });
    assert.equal(retried.status, 200);
    assert.equal(retried.body.status, "PAID_OUT");
    assert.equal(eventTypes(retried.body).filter((t) => t === "payout.issued").length, 1);
  });
});

describe("validation", () => {
  it("validates job creation", async () => {
    api = await startTestServer();
    const cases: [unknown, number][] = [
      [{ ...SEED_BOOKING, amountKobo: 0 }, 400],
      [{ ...SEED_BOOKING, amountKobo: 12.5 }, 400],
      [{ ...SEED_BOOKING, amountKobo: 50_000_001 }, 400],
      [{ ...SEED_BOOKING, title: "   " }, 400],
      [{ ...SEED_BOOKING, customerId: "usr_nobody" }, 400],
      [{ ...SEED_BOOKING, customerId: "usr_emeka" }, 400], // a worker is not a customer
      [{ ...SEED_BOOKING, amountKobo: "1500000" }, 400],
      [{ ...SEED_BOOKING, amountKobo: 50_000_000 }, 201],
    ];
    for (const [body, status] of cases) {
      const res = await api.request("POST", "/api/jobs", body);
      assert.equal(res.status, status, JSON.stringify(body));
      if (status === 400) assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
  });

  it("returns 400 for a bad party or reason, 404 for unknown jobs and routes, 400 for bad JSON", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    const badParty = await api.request("POST", `/api/jobs/${id}/confirm`, { party: "admin" });
    assert.equal(badParty.status, 400);
    assert.equal(badParty.body.error.code, "VALIDATION_ERROR");

    const badReason = await api.request("POST", `/api/jobs/${id}/claim`, { filedBy: "customer", reason: "boredom" });
    assert.equal(badReason.status, 400);

    const missing = await api.request("GET", "/api/jobs/job_missing");
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, "NOT_FOUND");

    const missingQuote = await api.request("POST", "/api/jobs/job_missing/quote");
    assert.equal(missingQuote.status, 404);

    const route = await api.request("GET", "/api/nope");
    assert.equal(route.status, 404);

    const json = await api.request("POST", "/api/jobs", "{not json");
    assert.equal(json.status, 400);
    assert.equal(json.body.error.code, "INVALID_JSON");
  });
});

describe("modes and demo support", () => {
  it("reports modes and never falls back from a failing live adapter", async () => {
    api = await startTestServer({ modes: { payment: "live" } });

    const config = await api.request("GET", "/api/config");
    assert.deepEqual(config.body, { modes: { payment: "live", insurance: "mock", payout: "mock" } });

    const { body: job } = await api.request<JobView>("POST", "/api/jobs", SEED_BOOKING);
    assert.equal(job.modes.payment, "live");
    const { body: quote } = await api.request("POST", `/api/jobs/${job.id}/quote`);

    const pay = await api.request("POST", `/api/jobs/${job.id}/pay`, { quoteId: quote.quoteId });
    assert.equal(pay.status, 502);
    assert.equal(pay.body.error.code, "ADAPTER_ERROR");
    assert.match(pay.body.error.message, /PAYMENT_MODE=mock/);
    const after = await api.request<JobView>("GET", `/api/jobs/${job.id}`);
    assert.equal(after.body.status, "BOOKED");
    assert.equal(after.body.escrowRef, null);
  });

  it("reset restores exactly the seed and re-arms MOCK_FAIL", async () => {
    api = await startTestServer({ failOnce: ["quote"] });
    assert.equal((await api.request("POST", `/api/jobs/${api.seedJobId}/quote`)).status, 502);
    await insuredJob(api);

    const started = performance.now();
    const reset = await api.request("POST", "/api/demo/reset");
    assert.ok(performance.now() - started < 1000);
    assert.equal(reset.status, 200);

    const { body: job } = await api.request<JobView>("GET", `/api/jobs/${reset.body.jobId}`);
    assert.equal(job.status, "BOOKED");
    assert.equal(job.title, "Brake repair");
    assert.equal(job.amountKobo, 1_500_000);
    assert.deepEqual(job.customer, { id: "usr_tunde", name: "Tunde" });
    assert.deepEqual(job.worker, { id: "usr_emeka", name: "Emeka" });
    assert.deepEqual(eventTypes(job), ["job.booked"]);
    assert.equal((await api.request("GET", `/api/jobs/${api.seedJobId}`)).status, 404);

    assert.equal((await api.request("POST", `/api/jobs/${job.id}/quote`)).status, 502, "MOCK_FAIL re-armed");
    assert.equal((await api.request("POST", `/api/jobs/${job.id}/quote`)).status, 200);
  });
});
