import { z } from "zod";
import type { EcobankConfig } from "../../config.ts";
import type { Logger } from "../../logger.ts";
import { EcobankApiError, SUCCESS_CODE, describeBody, headerResponseOf, postJson, type FetchFn } from "./http.ts";
import { TOKEN_REQUEST_TYPE, signRequest } from "./signing.ts";

export const TOKEN_PATH = "/corp-auth/api/v2/integration/auth/app/token";

/** Ecobank's docs say tokens last about 5 minutes; used only if the response gives no usable expiry. */
const FALLBACK_LIFETIME_MS = 5 * 60_000;
/** Refresh this long before expiry (capped at a fifth of the token's lifetime). */
const REFRESH_MARGIN_MS = 30_000;
/** Never trust a lifetime shorter than this; guards against clock skew causing a fetch on every call. */
const MIN_LIFETIME_MS = 30_000;

const tokenResponse = z.object({
  data: z.object({
    access_token: z.string().min(1),
    expires_in: z.number().optional(),
  }),
});

interface CachedToken {
  value: string;
  issuedAt: number;
  expiresAt: number;
}

export interface EcobankTokenProviderOptions {
  config: EcobankConfig;
  /** Tokens are scoped to a service (the JWT carries it as a role), e.g. "DOMESTIC". */
  serviceCode: string;
  logger: Logger;
  fetch?: FetchFn;
  now?: () => number;
}

/**
 * Hands out a valid Ecobank access token. It caches the token and fetches a new one shortly
 * before it expires. Concurrent callers share one in-flight request, so a burst of API
 * calls never stampedes the token endpoint.
 *
 * The refresh_token is not used: Ecobank documents no refresh endpoint, and asking for a new
 * token with the app credentials achieves the same thing.
 */
export class EcobankTokenProvider {
  readonly #config: EcobankConfig;
  readonly #serviceCode: string;
  readonly #log: Logger;
  readonly #fetch: FetchFn;
  readonly #now: () => number;
  #cached: CachedToken | null = null;
  #inflight: Promise<CachedToken> | null = null;

  constructor(options: EcobankTokenProviderOptions) {
    this.#config = options.config;
    this.#serviceCode = options.serviceCode;
    this.#log = options.logger;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? Date.now;
  }

  get serviceCode(): string {
    return this.#serviceCode;
  }

  async getToken(): Promise<string> {
    const cached = this.#cached;
    if (cached && this.#now() < refreshAt(cached)) return cached.value;

    this.#inflight ??= this.#requestToken().finally(() => {
      this.#inflight = null;
    });
    return (await this.#inflight).value;
  }

  /** Drops the cached token, e.g. after the API rejects it with 401. */
  invalidate(): void {
    this.#cached = null;
  }

  async #requestToken(): Promise<CachedToken> {
    const c = this.#config;
    // Hash order for the token request: header fields, requestToken, publicKey, serviceCode.
    const { headerRequest, secureHash } = signRequest(c, TOKEN_REQUEST_TYPE, [c.publicKey, this.#serviceCode]);
    const requestId = headerRequest.requestId;
    const payload = {
      headerRequest,
      publicKey: c.publicKey,
      serviceCode: this.#serviceCode,
      secureHash,
    };

    const res = await postJson(
      this.#fetch,
      c.baseUrl + TOKEN_PATH,
      { "Ocp-Apim-Subscription-Key": c.subscriptionKey },
      payload,
      c.timeoutMs,
    );

    const header = headerResponseOf(res.body);
    if (!res.ok || header?.responseCode !== SUCCESS_CODE) {
      throw new EcobankApiError(`token request rejected (HTTP ${res.status}): ${describeBody(res.body)}`, {
        httpStatus: res.status,
        ...(header?.responseCode !== undefined && { responseCode: header.responseCode }),
      });
    }
    const parsed = tokenResponse.safeParse(res.body);
    if (!parsed.success) {
      throw new EcobankApiError("token response has no data.access_token", { httpStatus: res.status });
    }

    const issuedAt = this.#now();
    const lifetime = Math.max(tokenLifetimeMs(parsed.data.data.access_token, parsed.data.data.expires_in, issuedAt), MIN_LIFETIME_MS);
    const token: CachedToken = { value: parsed.data.data.access_token, issuedAt, expiresAt: issuedAt + lifetime };
    this.#cached = token;
    this.#log.info("ecobank token issued", {
      serviceCode: this.#serviceCode,
      requestId,
      lifetimeS: Math.round(lifetime / 1000),
      expiresAt: new Date(token.expiresAt).toISOString(),
    });
    return token;
  }
}

function refreshAt(token: CachedToken): number {
  const margin = Math.min(REFRESH_MARGIN_MS, (token.expiresAt - token.issuedAt) / 5);
  return token.expiresAt - margin;
}

/**
 * How long a fresh token is good for, measured against our own clock.
 * Preference: the JWT's exp - iat (immune to clock skew), then `expires_in`. In the UAT
 * gateway `expires_in` is an absolute epoch in milliseconds, not a duration, so all three
 * shapes are handled.
 */
export function tokenLifetimeMs(accessToken: string, expiresIn: number | undefined, now: number): number {
  const claims = jwtClaims(accessToken);
  if (claims?.exp !== undefined) {
    return claims.iat !== undefined ? (claims.exp - claims.iat) * 1000 : claims.exp * 1000 - now;
  }
  if (expiresIn !== undefined) {
    if (expiresIn > 1e12) return expiresIn - now; // epoch ms
    if (expiresIn > 1e9) return expiresIn * 1000 - now; // epoch s
    return expiresIn * 1000; // duration in seconds
  }
  return FALLBACK_LIFETIME_MS;
}

/** Reads (does not verify) the exp/iat claims of a JWT. */
function jwtClaims(token: string): { exp?: number; iat?: number } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    return {
      ...(typeof claims["exp"] === "number" && { exp: claims["exp"] }),
      ...(typeof claims["iat"] === "number" && { iat: claims["iat"] }),
    };
  } catch {
    return null;
  }
}
