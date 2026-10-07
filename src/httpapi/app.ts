import express, { type Express, type RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import type { JobService } from "../jobs/service.ts";
import type { Logger } from "../logger.ts";
import { cors } from "./cors.ts";
import { errorHandler, notFoundHandler } from "./errors.ts";
import { openApiDocument } from "./openapi.ts";
import { apiRoutes } from "./routes.ts";

export interface AppOptions {
  jobs: JobService;
  logger: Logger;
  corsOrigins: readonly string[];
}

export function createApp({ jobs, logger, corsOrigins }: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestLog(logger));
  app.use(cors(corsOrigins));
  app.use(express.json({ limit: "32kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  // API docs: raw spec, and Swagger UI served from node_modules (works offline).
  const spec = openApiDocument();
  app.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "SureJob API docs" }));

  app.use("/api", apiRoutes(jobs));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

function requestLog(log: Logger): RequestHandler {
  return (req, res, next) => {
    const started = performance.now();
    res.on("finish", () => {
      log.info("request", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Math.round(performance.now() - started),
      });
    });
    next();
  };
}
