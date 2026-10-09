import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { JobView } from "../src/jobs/view.ts";
import { eventTypes, insuredJob, SEED_BOOKING, startTestServer, type TestServer } from "./helpers.ts";

let api: TestServer;

afterEach(async () => {
  await api?.close();
});

const NEW_WORKER_BOOKING = {
  title: "Leaking pipe",
  amountKobo: 800_000,
  newWorker: { name: "Musa", phone: "+234 803 111 2222", trade: "plumber" },
};

describe("happy path", () => {
  it("books, quotes, pays, both confirm and issues one payout", async () => {
    api = await startTestServer();

    const booked = await api.request<JobView>("POST", "/api/jobs", SEED_BOOKING);
    assert.equal(booked.status, 201);
    assert.equal(booked.body.status, "BOOKED");
    assert.equal(booked.body.premiumKobo, null);
    assert.equal(booked.body.you, "customer");
    assert.deepEqual(booked.body.customer, { id: "usr_tunde", name: "Tunde" });
    assert.deepEqual(booked.body.worker, { id: "usr_emeka", name: "Emeka", onPlatform: true });
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

    const first = await api.request<JobView>("POST", `/api/jobs/${id}/confirm`);
    assert.equal(first.body.status, "INSURED");
    assert.deepEqual(first.body.confirmations, { customer: true, worker: false });
    assert.equal(first.body.payout, null);

    const second = await api.asWorker<JobView>("POST", `/api/jobs/${id}/confirm`);
    assert.equal(second.body.status, "PAID_OUT");
    assert.equal(second.body.you, "worker");
    assert.match(second.body.payout!.code!, /^\d{8}$/);
    assert.ok(Date.parse(second.body.payout!.expiresAt!) > Date.now());

    // Repeats are no-ops, and the customer never sees an on-platform worker's code.
    const again = await api.asWorker<JobView>("POST", `/api/jobs/${id}/confirm`);
    assert.deepEqual(again.body.payout, second.body.payout);
    const asCustomer = await api.request<JobView>("POST", `/api/jobs/${id}/confirm`);
    assert.equal(asCustomer.status, 200);
    assert.deepEqual(asCustomer.body.payout, { ...second.body.payout, code: null });

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
    assert.ok(!final.body.events.some((e) => e.detail.includes(second.body.payout!.code!)), "code must not leak into the timeline");
    assert.deepEqual(final.body.modes, { payment: "mock", insurance: "mock", payout: "mock" });
  });

  it("files a claim from INSURED and holds the payout", async () => {
    api = await startTestServer();
    const job = await insuredJob(api);

    const claimed = await api.request<JobView>("POST", `/api/jobs/${job.id}/claim`, {
      reason: "damage",
      details: "Scratched wheel",
    });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.status, "CLAIM_FILED");
    assert.match(claimed.body.claim!.ref, /^CLM-/);
    assert.deepEqual({ ...claimed.body.claim, ref: "x" }, { ref: "x", status: "received", reason: "damage" });
    assert.match(claimed.body.events.at(-1)!.detail, /^Customer filed a property damage claim/);

    const confirm = await api.asWorker("POST", `/api/jobs/${job.id}/confirm`);
    assert.equal(confirm.status, 409);
    assert.equal(confirm.body.error.code, "INVALID_TRANSITION");

    const again = await api.asWorker("POST", `/api/jobs/${job.id}/claim`, { reason: "injury" });
    assert.equal(again.status, 409);
  });
});

describe("workers not on SureJob", () => {
  it("books a new worker; the customer's confirmation alone pays out and the customer sees the code", async () => {
    api = await startTestServer();

    const booked = await api.request<JobView>("POST", "/api/jobs", NEW_WORKER_BOOKING);
    assert.equal(booked.status, 201);
    assert.equal(booked.body.worker.name, "Musa");
    assert.equal(booked.body.worker.onPlatform, false);
    assert.deepEqual(eventTypes(booked.body), ["job.booked", "worker.added"]);

    const insured = await insuredJob(api, NEW_WORKER_BOOKING);
    const paidOut = await api.request<JobView>("POST", `/api/jobs/${insured.id}/confirm`);
    assert.equal(paidOut.status, 200);
    assert.equal(paidOut.body.status, "PAID_OUT");
    assert.deepEqual(paidOut.body.confirmations, { customer: true, worker: false });
    assert.match(paidOut.body.payout!.code!, /^\d{8}$/, "customer relays the code to an off-platform worker");
    assert.match(paidOut.body.events.find((e) => e.type === "job.confirmed")!.detail, /Musa is not on SureJob/);
  });

  it("does not list new workers as registered workers", async () => {
    api = await startTestServer();
    await api.request("POST", "/api/jobs", NEW_WORKER_BOOKING);
    const workers = await api.request("GET", "/api/workers");
    assert.equal(workers.status, 200);
    assert.deepEqual(workers.body, { workers: [{ id: "usr_emeka", name: "Emeka", trade: "mechanic" }] });
  });

  it("requires exactly one of workerId or newWorker, and a valid phone", async () => {
    api = await startTestServer();
    const { workerId: _ignored, ...withoutWorker } = SEED_BOOKING;
    for (const body of [
      withoutWorker,
      { ...SEED_BOOKING, newWorker: NEW_WORKER_BOOKING.newWorker },
      { ...NEW_WORKER_BOOKING, newWorker: { name: "Musa", phone: "12" } },
    ]) {
      const res = await api.request("POST", "/api/jobs", body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
  });
});

describe("price negotiation", () => {
  it("worker counters, customer counters, worker accepts; payment uses the agreed price", async () => {
    api = await startTestServer();
    const id = api.seedJobId; // Brake repair at ₦15,000 with Emeka
    const quoteBefore = await api.request("POST", `/api/jobs/${id}/quote`);

    const offer = await api.asWorker<JobView>("POST", `/api/jobs/${id}/offer`, { amountKobo: 1_800_000 });
    assert.equal(offer.status, 200);
    assert.deepEqual({ ...offer.body.pendingOffer, at: "x" }, { by: "worker", amountKobo: 1_800_000, at: "x" });
    assert.equal(offer.body.amountKobo, 1_500_000, "price unchanged until accepted");

    const blocked = await api.request("POST", `/api/jobs/${id}/pay`, { quoteId: quoteBefore.body.quoteId });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.code, "OFFER_PENDING");
    assert.equal((await api.request("POST", `/api/jobs/${id}/quote`)).body.error.code, "OFFER_PENDING");
    assert.equal((await api.asWorker("POST", `/api/jobs/${id}/offer/accept`)).body.error.code, "FORBIDDEN", "not your own offer");

    const counter = await api.request<JobView>("POST", `/api/jobs/${id}/offer`, { amountKobo: 1_650_000 });
    assert.equal(counter.body.pendingOffer?.by, "customer");
    const agreed = await api.asWorker<JobView>("POST", `/api/jobs/${id}/offer/accept`);
    assert.equal(agreed.status, 200);
    assert.equal(agreed.body.amountKobo, 1_650_000);
    assert.equal(agreed.body.pendingOffer, null);
    assert.equal(agreed.body.quoteId, null, "the old quote priced ₦15,000");

    const stale = await api.request("POST", `/api/jobs/${id}/pay`, { quoteId: quoteBefore.body.quoteId });
    assert.equal(stale.body.error.code, "QUOTE_REQUIRED");
    const quote = await api.request("POST", `/api/jobs/${id}/quote`);
    assert.equal(quote.body.totalKobo, 1_650_000 + quote.body.premiumKobo);
    const paid = await api.request<JobView>("POST", `/api/jobs/${id}/pay`, { quoteId: quote.body.quoteId });
    assert.equal(paid.body.status, "INSURED");
    assert.match(paid.body.events.find((e) => e.type === "payment.escrowed")!.detail, /^₦16,850.00 held/); // ₦16,500 + ₦350 cover
    assert.deepEqual(
      eventTypes(paid.body).filter((t) => t.startsWith("price.")),
      ["price.offered", "price.countered", "price.agreed"],
    );

    const late = await api.asWorker("POST", `/api/jobs/${id}/offer`, { amountKobo: 2_000_000 });
    assert.equal(late.status, 409, "no bargaining after payment");
    assert.equal(late.body.error.code, "INVALID_TRANSITION");
  });

  it("declining or withdrawing keeps the price and unblocks payment", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    await api.request("POST", `/api/jobs/${id}/offer`, { amountKobo: 1_200_000 });
    const declined = await api.asWorker<JobView>("POST", `/api/jobs/${id}/offer/decline`);
    assert.equal(declined.body.pendingOffer, null);
    assert.equal(declined.body.amountKobo, 1_500_000);
    assert.equal(eventTypes(declined.body).at(-1), "price.declined");

    await api.request("POST", `/api/jobs/${id}/offer`, { amountKobo: 1_300_000 });
    const withdrawn = await api.request<JobView>("POST", `/api/jobs/${id}/offer/decline`);
    assert.equal(eventTypes(withdrawn.body).at(-1), "price.withdrawn");

    const quote = await api.request("POST", `/api/jobs/${id}/quote`);
    assert.equal((await api.request("POST", `/api/jobs/${id}/pay`, { quoteId: quote.body.quoteId })).status, 200);
  });

  it("rejects bad offers, offers with no answerable offer, and off-platform workers", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    for (const amountKobo of [0, -5, 12.5, 50_000_001, 1_500_000]) {
      const res = await api.request("POST", `/api/jobs/${id}/offer`, { amountKobo });
      assert.equal(res.status, 400, String(amountKobo));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
    assert.equal((await api.request("POST", `/api/jobs/${id}/offer/accept`)).body.error.code, "INVALID_TRANSITION");
    assert.equal((await api.request("POST", `/api/jobs/${id}/offer/decline`)).body.error.code, "INVALID_TRANSITION");

    const { body: guestJob } = await api.request<JobView>("POST", "/api/jobs", NEW_WORKER_BOOKING);
    const guest = await api.request("POST", `/api/jobs/${guestJob.id}/offer`, { amountKobo: 700_000 });
    assert.equal(guest.status, 403);
    assert.match(guest.body.error.message, /SureJob account/);
  });
});

describe("auth", () => {
  it("registers, logs in and identifies the user", async () => {
    api = await startTestServer();
    const account = { name: "Ada", email: "Ada@Example.com", password: "s3cret-pass", role: "customer", phone: "08031234567" };

    const registered = await api.anon("POST", "/api/auth/register", account);
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.email, "ada@example.com");
    assert.equal(registered.body.user.passwordHash, undefined, "never expose the hash");
    assert.equal((await api.anon("POST", "/api/auth/register", account)).body.error.code, "EMAIL_TAKEN");

    const login = await api.anon("POST", "/api/auth/login", { email: "ada@example.com", password: "s3cret-pass" });
    assert.equal(login.status, 200);
    const me = await api.as(login.body.token)("GET", "/api/auth/me");
    assert.equal(me.body.user.name, "Ada");

    // A new customer can book straight away.
    const booked = await api.as(login.body.token)<JobView>("POST", "/api/jobs", SEED_BOOKING);
    assert.equal(booked.status, 201);
    assert.equal(booked.body.customer.name, "Ada");
  });

  it("rejects bad credentials and bad tokens", async () => {
    api = await startTestServer();
    for (const body of [
      { email: "tunde@example.com", password: "wrong-password" },
      { email: "nobody@example.com", password: "password123" },
    ]) {
      const res = await api.anon("POST", "/api/auth/login", body);
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
    }
    assert.equal((await api.anon("GET", `/api/jobs/${api.seedJobId}`)).status, 401);
    assert.equal((await api.as("not-a-jwt")("GET", "/api/jobs")).body.error.code, "UNAUTHORIZED");
    assert.equal((await api.anon("GET", "/api/config")).status, 200, "config stays public");
  });

  it("enforces who can do what on a job", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    assert.equal((await api.asWorker("POST", "/api/jobs", SEED_BOOKING)).body.error.code, "FORBIDDEN");
    assert.equal((await api.asWorker("POST", `/api/jobs/${id}/quote`)).body.error.code, "FORBIDDEN");

    const outsider = await api.anon("POST", "/api/auth/register", {
      name: "Eve",
      email: "eve@example.com",
      password: "password123",
      role: "customer",
      phone: "+2348039999999",
    });
    const res = await api.as(outsider.body.token)("GET", `/api/jobs/${id}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "FORBIDDEN");
  });

  it("lists each user's own jobs", async () => {
    api = await startTestServer();
    await api.request("POST", "/api/jobs", NEW_WORKER_BOOKING);
    const mine = await api.request<{ jobs: JobView[] }>("GET", "/api/jobs");
    assert.deepEqual(
      mine.body.jobs.map((j) => j.title),
      ["Leaking pipe", "Brake repair"],
    );
    const workers = await api.asWorker<{ jobs: JobView[] }>("GET", "/api/jobs");
    assert.deepEqual(workers.body.jobs.map((j) => [j.title, j.you]), [["Brake repair", "worker"]]);
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
      ["confirm", undefined],
      ["claim", { reason: "damage" }],
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
    await api.request("POST", `/api/jobs/${job.id}/confirm`);

    const failed = await api.asWorker("POST", `/api/jobs/${job.id}/confirm`);
    assert.equal(failed.status, 502);
    const confirmed = await api.request<JobView>("GET", `/api/jobs/${job.id}`);
    assert.equal(confirmed.body.status, "CONFIRMED");
    assert.equal(confirmed.body.payout, null);

    const retried = await api.asWorker<JobView>("POST", `/api/jobs/${job.id}/confirm`);
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
      [{ ...SEED_BOOKING, workerId: "usr_nobody" }, 400],
      [{ ...SEED_BOOKING, workerId: "usr_tunde" }, 400], // a customer is not a worker
      [{ ...SEED_BOOKING, amountKobo: "1500000" }, 400],
      [{ ...SEED_BOOKING, amountKobo: 50_000_000 }, 201],
    ];
    for (const [body, status] of cases) {
      const res = await api.request("POST", "/api/jobs", body);
      assert.equal(res.status, status, JSON.stringify(body));
      if (status === 400) assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
  });

  it("returns 400 for a bad reason, 404 for unknown jobs and routes, 400 for bad JSON", async () => {
    api = await startTestServer();
    const id = api.seedJobId;

    const badReason = await api.request("POST", `/api/jobs/${id}/claim`, { reason: "boredom" });
    assert.equal(badReason.status, 400);
    assert.equal(badReason.body.error.code, "VALIDATION_ERROR");

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

    const config = await api.anon("GET", "/api/config");
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

  it("reset restores exactly the seed, removes registered accounts and re-arms MOCK_FAIL", async () => {
    api = await startTestServer({ failOnce: ["quote"] });
    assert.equal((await api.request("POST", `/api/jobs/${api.seedJobId}/quote`)).status, 502);
    await insuredJob(api);
    const extra = await api.anon("POST", "/api/auth/register", {
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
      role: "customer",
      phone: "+2348031234567",
    });

    const started = performance.now();
    const reset = await api.anon("POST", "/api/demo/reset");
    assert.ok(performance.now() - started < 1000);
    assert.equal(reset.status, 200);

    assert.equal((await api.as(extra.body.token)("GET", "/api/auth/me")).status, 401, "registered accounts are wiped");
    const { body: job } = await api.request<JobView>("GET", `/api/jobs/${reset.body.jobId}`);
    assert.equal(job.status, "BOOKED");
    assert.equal(job.title, "Brake repair");
    assert.equal(job.amountKobo, 1_500_000);
    assert.deepEqual(job.customer, { id: "usr_tunde", name: "Tunde" });
    assert.deepEqual(job.worker, { id: "usr_emeka", name: "Emeka", onPlatform: true });
    assert.deepEqual(eventTypes(job), ["job.booked"]);
    assert.equal((await api.request("GET", `/api/jobs/${api.seedJobId}`)).status, 404);

    assert.equal((await api.request("POST", `/api/jobs/${job.id}/quote`)).status, 502, "MOCK_FAIL re-armed");
    assert.equal((await api.request("POST", `/api/jobs/${job.id}/quote`)).status, 200);
  });
});

describe("API docs", () => {
  it("serves an OpenAPI 3.1 spec covering every endpoint, and Swagger UI", async () => {
    api = await startTestServer();

    const spec = await api.anon("GET", "/openapi.json");
    assert.equal(spec.status, 200);
    assert.equal(spec.body.openapi, "3.1.0");
    const operations = Object.entries(spec.body.paths).flatMap(([path, ops]) =>
      Object.keys(ops as object).map((method) => `${method.toUpperCase()} ${path}`),
    );
    assert.deepEqual(operations.sort(), [
      "GET /api/auth/me",
      "GET /api/config",
      "GET /api/jobs",
      "GET /api/jobs/{id}",
      "GET /api/workers",
      "POST /api/auth/login",
      "POST /api/auth/register",
      "POST /api/demo/reset",
      "POST /api/jobs",
      "POST /api/jobs/{id}/claim",
      "POST /api/jobs/{id}/confirm",
      "POST /api/jobs/{id}/offer",
      "POST /api/jobs/{id}/offer/accept",
      "POST /api/jobs/{id}/offer/decline",
      "POST /api/jobs/{id}/pay",
      "POST /api/jobs/{id}/quote",
    ]);
    assert.ok(spec.body.components.schemas.Job);
    assert.ok(spec.body.components.securitySchemes.bearerAuth);

    const ui = await fetch(`${api.baseUrl}/docs/`);
    assert.equal(ui.status, 200);
    assert.match(await ui.text(), /<title>SureJob API docs<\/title>/);
  });
});
