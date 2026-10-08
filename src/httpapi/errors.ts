import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { DomainError, errorMessage, type ErrorCode } from "../errors.ts";
import type { Logger } from "../logger.ts";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  QUOTE_REQUIRED: 409,
  QUOTE_MISMATCH: 409,
  ADAPTER_ERROR: 502,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  EMAIL_TAKEN: 409,
};

/** Contract error shape: `{ error: { code, message } }`. */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, "NOT_FOUND", `no route for ${req.method} ${req.path}`);
};

/** Raised by express.json() (body-parser); `type` identifies the failure. */
interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(err: unknown): err is BodyParserError {
  return typeof err === "object" && err !== null && "type" in err && "status" in err;
}

export function errorHandler(log: Logger): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof DomainError) {
      return sendError(res, STATUS_BY_CODE[err.code], err.code, err.message);
    }
    if (isBodyParserError(err)) {
      if (err.type === "entity.parse.failed") return sendError(res, 400, "INVALID_JSON", "request body is not valid JSON");
      if (err.type === "entity.too.large") return sendError(res, 413, "PAYLOAD_TOO_LARGE", "request body is too large");
      return sendError(res, err.status, "BAD_REQUEST", errorMessage(err));
    }

    log.error("unhandled error", {
      method: req.method,
      path: req.path,
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
    });
    sendError(res, 500, "INTERNAL_ERROR", "something went wrong");
  };
}
