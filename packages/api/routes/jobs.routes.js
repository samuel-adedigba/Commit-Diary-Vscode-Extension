import express from "express";
import { createJobsController } from "../controllers/jobs.controller.js";
import { validateJobIdParam } from "../schemas/reporting.schema.js";

export function createJobsRouter({
  authMiddleware,
  supabaseAdmin,
  getStepper,
  reportService,
}) {
  const router = express.Router();
  const controller = createJobsController({
    supabaseAdmin,
    getStepper,
    reportService,
  });

  router.get(
    "/v1/jobs/:jobId",
    authMiddleware,
    validateJobIdParam,
    controller.getJobStatus,
  );

  router.post("/v1/jobs/recover", authMiddleware, controller.recoverJobs);

  return router;
}
