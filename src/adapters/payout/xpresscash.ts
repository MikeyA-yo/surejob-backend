import { z } from "zod";
import type { EcobankConfig } from "../../config.ts";
import type { EcobankClient } from "../ecobank/client.ts";
import { EcobankApiError, SUCCESS_CODE, describeBody } from "../ecobank/http.ts";
import { signRequest } from "../ecobank/signing.ts";
import type { IssueTokenInput, IssueTokenResult, PayoutAdapter } from "./payout.ts";

export const GENERATE_TOKEN_PATH = "/corp-token/api/v2/integration/token/generate";
const REQUEST_TYPE = "TOKEN_GENERATION";

const generateResponse = z.object({
  headerResponse: z.object({ responseCode: z.string() }),
  data: z
    .object({
      transactionReference: z.string().min(1),
      externalRefNo: z.string().optional(),
    })
    .nullish(),
});

/**
 * Live adapter for the Ecobank XpressCash Token Service: generates a cash token the worker
 * redeems at an Ecobank ATM, branch or agent.
 *
 * The documented success response carries only `transactionReference` and `externalRefNo`,
 * with no cash code and no expiry, so `code` and `expiresAt` come back null. Map them here once a
 * real UAT success shows where they live (or fetch them via /token/status).
 */
export class XpressCashPayoutAdapter implements PayoutAdapter {
  readonly mode = "live";
  readonly #client: EcobankClient;
  readonly #config: EcobankConfig;

  /** `client` must be authenticated for `config.payoutServiceCode`. */
  constructor(client: EcobankClient, config: EcobankConfig) {
    this.#client = client;
    this.#config = config;
  }

  async issueToken(input: IssueTokenInput): Promise<IssueTokenResult> {
    const receiverMobileNo = input.phone.replace(/\D/g, ""); // "+233245563223" → "233245563223"
    const amount = input.amountKobo / 100; // Ecobank takes major units
    const currency = this.#config.payoutCurrency;
    const description = `SureJob ${input.jobId}`;

    // Hash order: receiverMobileNo, amount, currency, description.
    const { headerRequest, secureHash } = signRequest(this.#config, REQUEST_TYPE, [
      receiverMobileNo,
      amount,
      currency,
      description,
    ]);
    const body = await this.#client.post(GENERATE_TOKEN_PATH, {
      headerRequest,
      secureHash,
      receiverMobileNo,
      amount,
      currency,
      description,
    });

    const parsed = generateResponse.safeParse(body);
    const responseCode = parsed.success ? parsed.data.headerResponse.responseCode : undefined;
    if (!parsed.success || responseCode !== SUCCESS_CODE || !parsed.data.data) {
      throw new EcobankApiError(`XpressCash token generation failed: ${describeBody(body)}`, {
        ...(responseCode !== undefined && { responseCode }),
      });
    }

    return { code: null, ref: parsed.data.data.transactionReference, expiresAt: null };
  }
}
