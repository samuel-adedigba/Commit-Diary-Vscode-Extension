import express from "express";
import { createReportingController } from "../controllers/reporting.controller.js";
import { validateRepoIdParam } from "../schemas/reporting.schema.js";

export function createReportingRouter({
  authMiddleware,
  supabaseAdmin,
  getStepper,
  reportService,
}) {
  const router = express.Router();
  const controller = createReportingController({
    supabaseAdmin,
    getStepper,
    reportService,
  });

  router.get(
    "/v1/repos/:repoId/reports/backfill",
    authMiddleware,
    validateRepoIdParam,
    controller.getBackfillStatus,
  );

  router.post(
    "/v1/repos/:repoId/reports/backfill/retry",
    authMiddleware,
    validateRepoIdParam,
    controller.retryBackfill,
  );

  router.get("/v1/repos/reports", authMiddleware, controller.listRepoReports);

  return router;
}
