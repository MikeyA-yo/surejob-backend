import type { RequestHandler } from "express";

/** Minimal CORS for the Next.js frontend. `allowedOrigins` may contain "*". */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowAny = allowedOrigins.includes("*");

  return (req, res, next) => {
    const origin = req.headers.origin;
    if (!allowAny) res.vary("Origin");

    if (origin !== undefined && (allowAny || allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", allowAny ? "*" : origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  };
}
