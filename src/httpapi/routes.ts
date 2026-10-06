import { Router } from "express";
import type { JobService } from "../jobs/service.ts";
import { claimBody, confirmBody, createJobBody, parseBody, payBody } from "./schemas.ts";

/** The eight endpoints of the API contract (PRD section 5), mounted under /api. */
export function apiRoutes(jobs: JobService): Router {
  const router = Router();

  router.get("/config", (_req, res) => {
    res.json({ modes: jobs.modes() });
  });

  router.post("/demo/reset", (_req, res) => {
    res.json(jobs.resetDemo());
  });

  router.post("/jobs", (req, res) => {
    const body = parseBody(createJobBody, req.body);
    res.status(201).json(jobs.createJob(body));
  });

  router.get("/jobs/:id", (req, res) => {
    res.json(jobs.getJob(req.params.id));
  });

  router.post("/jobs/:id/quote", async (req, res) => {
    res.json(await jobs.quote(req.params.id));
  });

  router.post("/jobs/:id/pay", async (req, res) => {
    const { quoteId } = parseBody(payBody, req.body);
    res.json(await jobs.pay(req.params.id, quoteId));
  });

  router.post("/jobs/:id/confirm", async (req, res) => {
    const { party } = parseBody(confirmBody, req.body);
    res.json(await jobs.confirm(req.params.id, party));
  });

  router.post("/jobs/:id/claim", async (req, res) => {
    const body = parseBody(claimBody, req.body);
    res.json(await jobs.fileClaim(req.params.id, body));
  });

  return router;
}
