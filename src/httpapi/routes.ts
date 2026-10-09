import { Router, type RequestHandler, type Response } from "express";
import type { AuthService } from "../auth/service.ts";
import type { JobService } from "../jobs/service.ts";
import { toUserView } from "../jobs/view.ts";
import type { UserRecord } from "../store/types.ts";
import { claimBody, createJobBody, loginBody, offerBody, parseBody, payBody, registerBody } from "./schemas.ts";

interface Services {
  jobs: JobService;
  auth: AuthService;
}

/** Rejects the request with 401 unless it carries a valid bearer token; stores the user for handlers. */
function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    res.locals["user"] = await auth.authenticate(req.headers.authorization);
    next();
  };
}

function currentUser(res: Response): UserRecord {
  return res.locals["user"] as UserRecord;
}

/** All endpoints, mounted under /api. Config and demo controls are public; everything else needs a login. */
export function apiRoutes({ jobs, auth }: Services): Router {
  const router = Router();

  // --- public -----------------------------------------------------------------
  router.get("/config", (_req, res) => {
    res.json({ modes: jobs.modes() });
  });

  router.post("/demo/reset", async (_req, res) => {
    res.json(await jobs.resetDemo());
  });

  router.post("/auth/register", async (req, res) => {
    res.status(201).json(await auth.register(parseBody(registerBody, req.body)));
  });

  router.post("/auth/login", async (req, res) => {
    const { email, password } = parseBody(loginBody, req.body);
    res.json(await auth.login(email, password));
  });

  // --- logged in ----------------------------------------------------------------
  router.use(requireAuth(auth));

  router.get("/auth/me", (_req, res) => {
    res.json({ user: toUserView(currentUser(res)) });
  });

  router.get("/workers", async (_req, res) => {
    res.json({ workers: await jobs.listWorkers() });
  });

  router.get("/jobs", async (_req, res) => {
    res.json({ jobs: await jobs.listJobs(currentUser(res)) });
  });

  router.post("/jobs", async (req, res) => {
    res.status(201).json(await jobs.createJob(currentUser(res), parseBody(createJobBody, req.body)));
  });

  router.get("/jobs/:id", async (req, res) => {
    res.json(await jobs.getJob(currentUser(res), req.params.id));
  });

  router.post("/jobs/:id/offer", async (req, res) => {
    const { amountKobo } = parseBody(offerBody, req.body);
    res.json(await jobs.offerPrice(currentUser(res), req.params.id, amountKobo));
  });

  router.post("/jobs/:id/offer/accept", async (req, res) => {
    res.json(await jobs.acceptOffer(currentUser(res), req.params.id));
  });

  router.post("/jobs/:id/offer/decline", async (req, res) => {
    res.json(await jobs.declineOffer(currentUser(res), req.params.id));
  });

  router.post("/jobs/:id/quote", async (req, res) => {
    res.json(await jobs.quote(currentUser(res), req.params.id));
  });

  router.post("/jobs/:id/pay", async (req, res) => {
    const { quoteId } = parseBody(payBody, req.body);
    res.json(await jobs.pay(currentUser(res), req.params.id, quoteId));
  });

  router.post("/jobs/:id/confirm", async (req, res) => {
    res.json(await jobs.confirm(currentUser(res), req.params.id));
  });

  router.post("/jobs/:id/claim", async (req, res) => {
    res.json(await jobs.fileClaim(currentUser(res), req.params.id, parseBody(claimBody, req.body)));
  });

  return router;
}
