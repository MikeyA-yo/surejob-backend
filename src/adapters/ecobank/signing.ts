import { createHash, randomBytes } from "node:crypto";
import type { EcobankConfig } from "../../config.ts";

/**
 * Ecobank request signing.
 *
 *   requestToken = SHA-512( clientId + affiliateCode + sourceCode + requestId + requestType + ipAddress + secretKey )
 *   secureHash   = SHA-512( <same header fields> + requestToken + <endpoint fields, in its documented order> + secretKey )
 *
 * Plain SHA-512 over UTF-8, lowercase hex, no separators. Not an HMAC: the secret key is simply
 * appended. Note the hash order differs from the JSON order of `headerRequest`.
 * Endpoint fields per the docs:
 *   GET_API_TOKEN    → publicKey, serviceCode
 *   TOKEN_GENERATION → receiverMobileNo, amount, currency, description
 */

export const TOKEN_REQUEST_TYPE = "GET_API_TOKEN";

/** The `headerRequest` object every Ecobank call carries. */
export interface HeaderRequest {
  affiliateCode: string;
  clientId: string;
  sourceCode: string;
  requestId: string;
  ipAddress: string;
  requestType: string;
  requestToken: string;
}

/** Numbers are stringified as JSON would (50000, not 50000.0), which is what String() does. */
export type HashField = string | number;

export interface SignedRequest {
  headerRequest: HeaderRequest;
  secureHash: string;
}

export function sha512Hex(parts: readonly HashField[]): string {
  return createHash("sha512").update(parts.map(String).join(""), "utf8").digest("hex");
}

type UnsignedHeader = Omit<HeaderRequest, "requestToken">;

function headerFields(h: UnsignedHeader): string[] {
  return [h.clientId, h.affiliateCode, h.sourceCode, h.requestId, h.requestType, h.ipAddress];
}

export function computeRequestToken(header: UnsignedHeader, secretKey: string): string {
  return sha512Hex([...headerFields(header), secretKey]);
}

export function computeSecureHash(header: HeaderRequest, endpointFields: readonly HashField[], secretKey: string): string {
  return sha512Hex([...headerFields(header), header.requestToken, ...endpointFields, secretKey]);
}

/** Unique per request for tracing on Ecobank's side. The gateway allows 3 to 20 characters: SJ + 8 + 6 = 16. */
export function newRequestId(): string {
  return `SJ${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toUpperCase();
}

/**
 * Builds a signed `headerRequest` + `secureHash` for one call, with a fresh requestId.
 * `endpointFields` are the body fields the endpoint's docs list for the hash, in that order.
 */
export function signRequest(
  config: EcobankConfig,
  requestType: string,
  endpointFields: readonly HashField[],
  requestId: string = newRequestId(),
): SignedRequest {
  const unsigned: UnsignedHeader = {
    affiliateCode: config.affiliateCode,
    clientId: config.clientId,
    sourceCode: config.sourceCode,
    requestId,
    ipAddress: config.ipAddress,
    requestType,
  };

  const { signing } = config;
  if (signing.kind === "static") {
    // Sandbox shortcut: the UAT gateway does not check these, so fixed values pass for any request.
    return { headerRequest: { ...unsigned, requestToken: signing.requestToken }, secureHash: signing.secureHash };
  }

  const headerRequest: HeaderRequest = { ...unsigned, requestToken: computeRequestToken(unsigned, signing.secretKey) };
  return { headerRequest, secureHash: computeSecureHash(headerRequest, endpointFields, signing.secretKey) };
}
