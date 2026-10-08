/**
 * Domain errors carry a stable machine-readable code. The HTTP layer maps codes to
 * status codes (see httpapi/errors.ts), so the service never deals in HTTP.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "QUOTE_REQUIRED"
  | "QUOTE_MISMATCH"
  | "ADAPTER_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "EMAIL_TAKEN";

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DomainError";
    this.code = code;
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
