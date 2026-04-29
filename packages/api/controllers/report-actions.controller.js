export function createReportActionsController({ supabaseAdmin, getStepper, reportService }) {
  const toggleRepoReports = async (req, res) => {
    try {
      const parsedRepoId = parseInt(req.params.repoId, 10);
      const { enabled } = req.body;
      const userId = req.userId;

      if (!enabled) {
        const result = await reportService.toggleReports(
          supabaseAdmin,
          parsedRepoId,
          userId,
          false,
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.json({
          message: "Reports disabled",
          enabled: false,
        });
      }

      const activeBackfill = await reportService.hasActiveBackfill(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      if (activeBackfill) {
        return res.status(409).json({
          error: "A backfill is already in progress for this repository",
          status: "processing",
        });
      }

      const unreportedCommits = await reportService.getRecentCommitsWithoutReports(
        supabaseAdmin,
        parsedRepoId,
        userId,
        reportService.AUTO_REPORT_LIMIT,
      );

      if (unreportedCommits.length === 0) {
        const result = await reportService.toggleReports(
          supabaseAdmin,
          parsedRepoId,
          userId,
          true,
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.json({
          message: "Reports enabled (all recent commits already have reports)",
          enabled: true,
          backfill: null,
        });
      }

      const backfillResult = await reportService.createBackfillJob(
        supabaseAdmin,
        parsedRepoId,
        userId,
        unreportedCommits,
      );

      if (!backfillResult.success) {
        return res.status(500).json({ error: backfillResult.error });
      }

      const stepper = getStepper?.() || null;
      if (!stepper) {
        return res.status(503).json({
          error: "Report generation service not available",
        });
      }

      for (const commit of unreportedCommits) {
        try {
          const promptInput = {
            userId,
            commitSha: commit.sha,
            repo: commit.repos?.name || "unknown",
            message: commit.message || "",
            files: (commit.files || []).map((f) => f.path || f),
            components: commit.components || [],
            diffSummary: commit.diff_summary || "",
          };

          const result = await stepper.enqueueReport(promptInput);

          if (result.status === 202 && result.jobId) {
            await reportService.createReportJob(supabaseAdmin, {
              commitId: commit.id,
              userId,
              jobId: result.jobId,
              repoId: parsedRepoId,
              backfillId: backfillResult.backfillId,
            });

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfillResult.backfillId,
              commit.id,
              "processing",
              result.jobId,
            );
          } else if (result.status === 200 && result.cached) {
            await reportService.saveCachedReport(
              supabaseAdmin,
              commit.id,
              userId,
              result.data,
              { provider: "cached", generationType: "backfill" },
            );

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfillResult.backfillId,
              commit.id,
              "completed",
            );
          }
        } catch (err) {
          await reportService.updateBackfillCommitStatus(
            supabaseAdmin,
            backfillResult.backfillId,
            commit.id,
            "failed",
            null,
            err.message,
          );
        }
      }

      const backfillStatus = await reportService.getBackfillStatus(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      return res.status(202).json({
        message: "Backfill started. Reports will be enabled once all complete.",
        enabled: false,
        backfill: {
          id: backfillResult.backfillId,
          status: backfillStatus?.status || "processing",
          totalCommits: unreportedCommits.length,
          completedCommits: backfillStatus?.completed_commits || 0,
          failedCommits: backfillStatus?.failed_commits || 0,
          commitDetails: backfillStatus?.commit_details || [],
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to toggle reports" });
    }
  };

  const getCommitReport = async (req, res) => {
    try {
      const commitId = parseInt(req.params.commitId, 10);
      const userId = req.userId;

      const report = await reportService.getReport(supabaseAdmin, commitId, userId);

      if (report) {
        return res.json({ status: "completed", report });
      }

      const job = await reportService.getJobStatus(supabaseAdmin, commitId, userId);

      if (job) {
        return res.json({
          status: job.status,
          jobId: job.job_id,
          attempts: job.attempts,
          createdAt: job.created_at,
        });
      }

      return res.json({ status: "not_found" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch report" });
    }
  };

  const generateCommitReport = async (req, res) => {
    try {
      const commitId = parseInt(req.params.commitId, 10);
      const userId = req.userId;

      const existingReport = await reportService.getReport(supabaseAdmin, commitId, userId);
      if (existingReport) {
        return res.json({
          status: "completed",
          message: "Report already exists",
          report: existingReport,
        });
      }

      const existingJob = await reportService.getJobStatus(supabaseAdmin, commitId, userId);
      if (existingJob && existingJob.status === "pending") {
        return res.status(202).json({
          status: "processing",
          message: "Report generation already in progress",
          jobId: existingJob.job_id,
        });
      }

      const commit = await reportService.getCommitForReport(supabaseAdmin, commitId, userId);
      if (!commit) {
        return res.status(404).json({ error: "Commit not found" });
      }

      const stepper = getStepper?.() || null;
      if (!stepper) {
        return res.status(503).json({ error: "Report generation service not available" });
      }

      const promptInput = {
        userId,
        commitSha: commit.sha,
        repo: commit.repos?.name || "unknown",
        message: commit.message || "",
        files: (commit.files || []).map((f) => f.path || f),
        components: commit.components || [],
        diffSummary: commit.diff_summary || "",
      };

      const result = await stepper.enqueueReport(promptInput);

      if (result.status === 200 && result.cached) {
        await reportService.saveCachedReport(
          supabaseAdmin,
          commitId,
          userId,
          result.data,
          { provider: "cached", generationType: "manual" },
        );

        return res.json({
          status: "completed",
          message: "Report generated from cache",
          report: result.data,
        });
      }

      if (!result.jobId) {
        return res.status(500).json({
          error: "Stepper did not return a job ID",
          debug: result,
        });
      }

      const jobResult = await reportService.createReportJob(supabaseAdmin, {
        commitId,
        userId,
        jobId: result.jobId,
        repoId: commit.repo_id,
      });

      if (!jobResult.success) {
        return res.status(500).json({ error: jobResult.error });
      }

      return res.status(202).json({
        status: "processing",
        message: "Report generation started",
        jobId: result.jobId,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to trigger report generation" });
    }
  };

  return {
    toggleRepoReports,
    getCommitReport,
    generateCommitReport,
  };
}
