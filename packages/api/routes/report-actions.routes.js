import express from "express";
import { createReportActionsController } from "../controllers/report-actions.controller.js";
import {
  validateCommitIdParam,
  validateRepoIdParam,
  validateToggleReportsBody,
} from "../schemas/reporting.schema.js";

export function createReportActionsRouter({
  authMiddleware,
  supabaseAdmin,
  getStepper,
  reportService,
}) {
  const router = express.Router();
  const controller = createReportActionsController({
    supabaseAdmin,
    getStepper,
    reportService,
  });

  router.put(
    "/v1/repos/:repoId/reports/toggle",
    authMiddleware,
    validateRepoIdParam,
    validateToggleReportsBody,
    controller.toggleRepoReports,
  );

  router.get(
    "/v1/commits/:commitId/report",
    authMiddleware,
    validateCommitIdParam,
    controller.getCommitReport,
  );

  router.post(
    "/v1/commits/:commitId/report",
    authMiddleware,
    validateCommitIdParam,
    controller.generateCommitReport,
  );

  return router;
}
