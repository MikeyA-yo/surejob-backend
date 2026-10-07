import { errorMessage } from "../../errors.ts";

export type FetchFn = typeof fetch;

/** Any failure talking to the Ecobank gateway. Messages never include credentials or tokens. */
export class EcobankApiError extends Error {
  readonly httpStatus: number | undefined;
  readonly responseCode: string | undefined;

  constructor(message: string, options: { httpStatus?: number; responseCode?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "EcobankApiError";
    this.httpStatus = options.httpStatus;
    this.responseCode = options.responseCode;
  }
}

/** Ecobank wraps every response in `{ headerResponse: { responseCode, ... }, data }`; "000" is success. */
export interface HeaderResponse {
  responseCode?: string;
  responseMessage?: string;
  responseDesc?: string;
}

export const SUCCESS_CODE = "000";

export interface JsonResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

/** POSTs JSON with Ecobank's mandatory headers and a timeout. Throws only on transport failure. */
export async function postJson(
  fetchFn: FetchFn,
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs: number,
): Promise<JsonResponse> {
  const path = new URL(url).pathname;
  let res: Response;
  try {
    res = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `timed out after ${timeoutMs}ms`
        : errorMessage(err instanceof Error && err.cause ? err.cause : err);
    throw new EcobankApiError(`POST ${path} failed: ${reason}`, { cause: err });
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, ok: res.ok, body };
}

export function headerResponseOf(body: unknown): HeaderResponse | undefined {
  if (typeof body !== "object" || body === null || !("headerResponse" in body)) return undefined;
  const header = (body as { headerResponse: unknown }).headerResponse;
  return typeof header === "object" && header !== null ? (header as HeaderResponse) : undefined;
}

/** Short, log-safe description of an error response. */
export function describeBody(body: unknown): string {
  const header = headerResponseOf(body);
  if (header) {
    return [header.responseCode, header.responseMessage, header.responseDesc].filter(Boolean).join(" ");
  }
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}
