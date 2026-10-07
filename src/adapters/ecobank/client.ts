import type { EcobankConfig } from "../../config.ts";
import { EcobankApiError, describeBody, postJson, type FetchFn } from "./http.ts";
import type { EcobankTokenProvider } from "./tokenProvider.ts";

export interface EcobankClientOptions {
  config: EcobankConfig;
  tokens: EcobankTokenProvider;
  fetch?: FetchFn;
}

/**
 * Authenticated POSTs to the Ecobank gateway. Adds the subscription key and a fresh bearer token,
 * and if the gateway answers 401 (token expired or revoked early) gets a new token and retries once.
 * Returns the parsed body; interpreting `headerResponse` codes is left to each adapter.
 */
export class EcobankClient {
  readonly #config: EcobankConfig;
  readonly #tokens: EcobankTokenProvider;
  readonly #fetch: FetchFn;

  constructor(options: EcobankClientOptions) {
    this.#config = options.config;
    this.#tokens = options.tokens;
    this.#fetch = options.fetch ?? fetch;
  }

  async post(path: string, payload: unknown): Promise<unknown> {
    for (let attempt = 1; ; attempt++) {
      const token = await this.#tokens.getToken();
      const res = await postJson(
        this.#fetch,
        this.#config.baseUrl + path,
        {
          "Ocp-Apim-Subscription-Key": this.#config.subscriptionKey,
          Authorization: `Bearer ${token}`,
        },
        payload,
        this.#config.timeoutMs,
      );

      if (res.status === 401 && attempt === 1) {
        this.#tokens.invalidate();
        continue;
      }
      if (!res.ok) {
        throw new EcobankApiError(`POST ${path} → HTTP ${res.status}: ${describeBody(res.body)}`, {
          httpStatus: res.status,
        });
      }
      return res.body;
    }
  }
}
