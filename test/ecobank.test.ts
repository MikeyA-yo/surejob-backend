import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { EcobankClient } from "../src/adapters/ecobank/client.ts";
import { EcobankApiError, type FetchFn } from "../src/adapters/ecobank/http.ts";
import { EcobankTokenProvider, TOKEN_PATH, tokenLifetimeMs } from "../src/adapters/ecobank/tokenProvider.ts";
import {
  computeRequestToken,
  computeSecureHash,
  signRequest,
  TOKEN_REQUEST_TYPE,
} from "../src/adapters/ecobank/signing.ts";
import { GENERATE_TOKEN_PATH, XpressCashPayoutAdapter } from "../src/adapters/payout/xpresscash.ts";
import { loadConfig, type EcobankConfig } from "../src/config.ts";
import { silentLogger } from "../src/logger.ts";

const config: EcobankConfig = {
  baseUrl: "https://gateway.test",
  subscriptionKey: "sub-key",
  affiliateCode: "EGH",
  clientId: "CL001",
  sourceCode: "CORP_CIB_MOBILE",
  ipAddress: "127.0.0.1",
  publicKey: "corp_public_x",
  signing: { kind: "static", requestToken: "req-token", secureHash: "secure-hash" },
  paymentServiceCode: "DOMESTIC",
  payoutServiceCode: "TOKEN",
  payoutCurrency: "GHS",
  timeoutMs: 1000,
};

function jwt(claims: Record<string, unknown>): string {
  const part = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.sig`;
}

function tokenBody(accessToken: string, expiresIn?: number) {
  return {
    headerResponse: { responseCode: "000", responseMessage: "SUCCESS" },
    data: { access_token: accessToken, token_type: "Bearer", ...(expiresIn !== undefined && { expires_in: expiresIn }) },
  };
}

interface Call {
  url: string;
  headers: Record<string, string>;
  body: any;
}

/** fetch stand-in that replays queued responses and records requests. */
function fakeFetch(responses: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const fn: FetchFn = async (input, init) => {
    calls.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  };
  return { fn, calls };
}

describe("EcobankTokenProvider", () => {
  it("sends the token request with credentials from config", async () => {
    const { fn, calls } = fakeFetch([{ body: tokenBody(jwt({ iat: 0, exp: 300 })) }]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn });
    await tokens.getToken();

    const [call] = calls;
    assert.equal(call!.url, `https://gateway.test${TOKEN_PATH}`);
    assert.equal(call!.headers["Ocp-Apim-Subscription-Key"], "sub-key");
    assert.equal(call!.headers["Authorization"], undefined);
    assert.equal(call!.body.headerRequest.requestType, "GET_API_TOKEN");
    assert.equal(call!.body.headerRequest.requestToken, "req-token");
    assert.equal(call!.body.headerRequest.affiliateCode, "EGH");
    assert.match(call!.body.headerRequest.requestId, /^SJ[0-9A-Z]{14}$/); // gateway limit: 3-20 chars
    assert.equal(call!.body.publicKey, "corp_public_x");
    assert.equal(call!.body.secureHash, "secure-hash");
    assert.equal(call!.body.serviceCode, "DOMESTIC");
  });

  it("serves the cached token until shortly before expiry, then fetches a new one", async () => {
    let now = 1_000_000;
    const { fn, calls } = fakeFetch([
      { body: tokenBody(jwt({ iat: 50, exp: 350 })) }, // 300s lifetime, refresh 30s early
      { body: tokenBody("second") },
    ]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn, now: () => now });

    const first = await tokens.getToken();
    now += 269_000;
    assert.equal(await tokens.getToken(), first);
    assert.equal(calls.length, 1);

    now += 2_000;
    assert.equal(await tokens.getToken(), "second");
    assert.equal(calls.length, 2);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    const { fn, calls } = fakeFetch([{ body: tokenBody(jwt({ iat: 0, exp: 300 })) }]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn });
    const results = await Promise.all([tokens.getToken(), tokens.getToken(), tokens.getToken()]);
    assert.equal(new Set(results).size, 1);
    assert.equal(calls.length, 1);
  });

  it("surfaces a rejected request and recovers on the next call", async () => {
    const { fn } = fakeFetch([
      { body: { headerResponse: { responseCode: "E01", responseMessage: "INVALID_HASH" } } },
      { body: tokenBody(jwt({ iat: 0, exp: 300 })) },
    ]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn });

    await assert.rejects(tokens.getToken(), (err) => {
      assert.ok(err instanceof EcobankApiError);
      assert.equal(err.responseCode, "E01");
      assert.match(err.message, /INVALID_HASH/);
      assert.doesNotMatch(err.message, /secure-hash|req-token|sub-key/);
      return true;
    });
    assert.ok(await tokens.getToken());
  });
});

describe("tokenLifetimeMs", () => {
  const now = 1_791_366_764_000;

  it("prefers the JWT's exp - iat", () => {
    assert.equal(tokenLifetimeMs(jwt({ iat: 1_791_366_764, exp: 1_791_384_764 }), 999, now), 18_000_000);
  });

  it("reads expires_in as epoch ms (UAT), epoch s, or a duration in seconds", () => {
    assert.equal(tokenLifetimeMs("opaque", 1_791_384_764_000, now), 18_000_000);
    assert.equal(tokenLifetimeMs("opaque", 1_791_384_764, now), 18_000_000);
    assert.equal(tokenLifetimeMs("opaque", 300, now), 300_000);
  });

  it("falls back to 5 minutes", () => {
    assert.equal(tokenLifetimeMs("opaque", undefined, now), 300_000);
  });
});

describe("EcobankClient", () => {
  it("authenticates calls and retries once with a new token after a 401", async () => {
    const { fn, calls } = fakeFetch([
      { body: tokenBody("token-1") },
      { status: 401, body: { message: "expired" } },
      { body: tokenBody("token-2") },
      { body: { headerResponse: { responseCode: "000" }, data: { ok: true } } },
    ]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn });
    const client = new EcobankClient({ config, tokens, fetch: fn });

    const body = await client.post("/some/api", { a: 1 });
    assert.deepEqual(body, { headerResponse: { responseCode: "000" }, data: { ok: true } });
    assert.equal(calls[1]!.headers["Authorization"], "Bearer token-1");
    assert.equal(calls[3]!.headers["Authorization"], "Bearer token-2");
    assert.equal(calls[3]!.headers["Ocp-Apim-Subscription-Key"], "sub-key");
  });

  it("gives up after a second 401", async () => {
    const { fn } = fakeFetch([
      { body: tokenBody("token-1") },
      { status: 401, body: {} },
      { body: tokenBody("token-2") },
      { status: 401, body: {} },
    ]);
    const tokens = new EcobankTokenProvider({ config, serviceCode: "DOMESTIC", logger: silentLogger, fetch: fn });
    const client = new EcobankClient({ config, tokens, fetch: fn });
    await assert.rejects(client.post("/some/api", {}), (err) => err instanceof EcobankApiError && err.httpStatus === 401);
  });
});

describe("Ecobank config", () => {
  it("is optional while payment and payout are mocked", () => {
    assert.equal(loadConfig({}).ecobank, null);
  });

  it("is required, with the missing variables named, when payment is live", () => {
    assert.throws(
      () => loadConfig({ PAYMENT_MODE: "live", ECOBANK_CLIENT_ID: "CL001" }),
      /Missing: ECOBANK_SUBSCRIPTION_KEY, ECOBANK_AFFILIATE_CODE, ECOBANK_SOURCE_CODE, ECOBANK_PUBLIC_KEY, ECOBANK_SECRET_KEY \(or ECOBANK_REQUEST_TOKEN \+ ECOBANK_SECURE_HASH\)/,
    );
  });

  it("prefers ECOBANK_SECRET_KEY over static hashes", () => {
    const base = {
      ECOBANK_SUBSCRIPTION_KEY: "k",
      ECOBANK_AFFILIATE_CODE: "EGH",
      ECOBANK_CLIENT_ID: "CL001",
      ECOBANK_SOURCE_CODE: "SRC",
      ECOBANK_PUBLIC_KEY: "pub",
    };
    assert.deepEqual(loadConfig({ ...base, ECOBANK_REQUEST_TOKEN: "t", ECOBANK_SECURE_HASH: "h" }).ecobank?.signing, {
      kind: "static",
      requestToken: "t",
      secureHash: "h",
    });
    assert.deepEqual(
      loadConfig({ ...base, ECOBANK_REQUEST_TOKEN: "t", ECOBANK_SECURE_HASH: "h", ECOBANK_SECRET_KEY: "s" }).ecobank?.signing,
      { kind: "secret", secretKey: "s" },
    );
  });
});

describe("Ecobank signing", () => {
  const sha512 = (text: string) => createHash("sha512").update(text, "utf8").digest("hex");
  const header = {
    affiliateCode: "EGH",
    clientId: "CL001",
    sourceCode: "CORP_CIB_MOBILE",
    requestId: "REQ1",
    ipAddress: "127.0.0.1",
    requestType: "GET_API_TOKEN",
  };

  it("requestToken = sha512(clientId affiliateCode sourceCode requestId requestType ipAddress secretKey)", () => {
    const token = computeRequestToken(header, "s3cret");
    assert.equal(token, sha512("CL001EGHCORP_CIB_MOBILEREQ1GET_API_TOKEN127.0.0.1s3cret"));
    assert.match(token, /^[0-9a-f]{128}$/);
  });

  it("secureHash = sha512(header fields, requestToken, endpoint fields, secretKey)", () => {
    const hash = computeSecureHash({ ...header, requestToken: "RT" }, ["corp_public_x", "DOMESTIC", 50000], "s3cret");
    assert.equal(hash, sha512("CL001EGHCORP_CIB_MOBILEREQ1GET_API_TOKEN127.0.0.1RTcorp_public_xDOMESTIC50000s3cret"));
  });

  it("signs each request afresh when a secret key is configured", () => {
    const secretConfig: EcobankConfig = { ...config, signing: { kind: "secret", secretKey: "s3cret" } };
    const a = signRequest(secretConfig, TOKEN_REQUEST_TYPE, ["corp_public_x", "DOMESTIC"], "REQ1");
    assert.equal(a.headerRequest.requestToken, computeRequestToken({ ...header, sourceCode: "CORP_CIB_MOBILE" }, "s3cret"));
    assert.equal(a.secureHash, computeSecureHash(a.headerRequest, ["corp_public_x", "DOMESTIC"], "s3cret"));

    const b = signRequest(secretConfig, TOKEN_REQUEST_TYPE, ["corp_public_x", "DOMESTIC"]);
    assert.notEqual(b.headerRequest.requestToken, a.headerRequest.requestToken);
  });

  it("reuses static hashes for every request type", () => {
    for (const type of [TOKEN_REQUEST_TYPE, "TOKEN_GENERATION"]) {
      const signed = signRequest(config, type, ["x"]);
      assert.equal(signed.headerRequest.requestType, type);
      assert.equal(signed.headerRequest.requestToken, "req-token");
      assert.equal(signed.secureHash, "secure-hash");
    }
  });
});

describe("XpressCashPayoutAdapter", () => {
  const generated = {
    headerResponse: { responseCode: "000", responseMessage: "SUCCESS" },
    data: { transactionReference: "CORPGH242880000361", externalRefNo: "REQ12345494890" },
  };

  function adapterWith(responses: { status?: number; body: unknown }[], cfg: EcobankConfig = config) {
    const { fn, calls } = fakeFetch([{ body: tokenBody(jwt({ iat: 0, exp: 300 })) }, ...responses]);
    const tokens = new EcobankTokenProvider({ config: cfg, serviceCode: cfg.payoutServiceCode, logger: silentLogger, fetch: fn });
    return { adapter: new XpressCashPayoutAdapter(new EcobankClient({ config: cfg, tokens, fetch: fn }), cfg), calls };
  }

  it("generates a token and maps the transaction reference", async () => {
    const { adapter, calls } = adapterWith([{ body: generated }]);
    const result = await adapter.issueToken({ jobId: "job_1", amountKobo: 2_000_000, phone: "+233245563223" });

    assert.deepEqual(result, { code: null, ref: "CORPGH242880000361", expiresAt: null });
    assert.equal(calls[0]!.body.serviceCode, "TOKEN");
    const call = calls[1]!;
    assert.equal(call.url, `https://gateway.test${GENERATE_TOKEN_PATH}`);
    assert.equal(call.body.headerRequest.requestType, "TOKEN_GENERATION");
    assert.deepEqual(
      { receiverMobileNo: call.body.receiverMobileNo, amount: call.body.amount, currency: call.body.currency, description: call.body.description },
      { receiverMobileNo: "233245563223", amount: 20_000, currency: "GHS", description: "SureJob job_1" },
    );
  });

  it("hashes receiverMobileNo, amount, currency, description when a secret key is set", async () => {
    const cfg: EcobankConfig = { ...config, signing: { kind: "secret", secretKey: "s3cret" } };
    const { adapter, calls } = adapterWith([{ body: generated }], cfg);
    await adapter.issueToken({ jobId: "job_1", amountKobo: 2_000_050, phone: "+233245563223" });

    const { headerRequest, secureHash } = calls[1]!.body;
    assert.equal(secureHash, computeSecureHash(headerRequest, ["233245563223", 20000.5, "GHS", "SureJob job_1"], "s3cret"));
  });

  it("throws with Ecobank's reason when generation is refused", async () => {
    const { adapter } = adapterWith([
      { body: { headerResponse: { responseCode: "999", responseMessage: "FAILED", responseDesc: "Insufficient Balance" } } },
    ]);
    await assert.rejects(
      adapter.issueToken({ jobId: "job_1", amountKobo: 10_000, phone: "+233245563223" }),
      (err) => err instanceof EcobankApiError && err.responseCode === "999" && /Insufficient Balance/.test(err.message),
    );
  });
});
