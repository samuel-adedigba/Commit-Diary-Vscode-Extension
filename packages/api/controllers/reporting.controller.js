export function createReportingController({ supabaseAdmin, getStepper, reportService }) {
  const getBackfillStatus = async (req, res) => {
    try {
      const parsedRepoId = parseInt(req.params.repoId, 10);
      const userId = req.userId;

      const backfill = await reportService.getBackfillStatus(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      if (!backfill) {
        return res.json({ backfill: null });
      }

      const recoveryMeta = await reportService.getBackfillRecoveryMetadata(
        supabaseAdmin,
        {
          backfill,
          userId,
          repoId: parsedRepoId,
        },
      );

      return res.json({
        backfill: {
          id: backfill.id,
          status: backfill.status,
          totalCommits: backfill.total_commits,
          completedCommits: backfill.completed_commits,
          failedCommits: backfill.failed_commits,
          commitDetails: backfill.commit_details,
          errorMessage: backfill.error_message,
          createdAt: backfill.created_at,
          updatedAt: backfill.updated_at,
          lastProgressAt: recoveryMeta?.lastProgressAt || backfill.updated_at,
          nextRecoveryAt: recoveryMeta?.nextRecoveryAt || null,
          estimatedState: recoveryMeta?.estimatedState || backfill.status,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch backfill status" });
    }
  };

  const retryBackfill = async (req, res) => {
    try {
      const parsedRepoId = parseInt(req.params.repoId, 10);
      const userId = req.userId;

      const resetResult = await reportService.resetBackfillForRetry(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      if (!resetResult.success) {
        return res.status(400).json({ error: resetResult.error });
      }

      const backfill = resetResult.backfill;
      const pendingCommits = backfill.commit_details.filter((d) => d.status === "pending");

      const stepper = getStepper?.() || null;
      if (!stepper) {
        return res.status(503).json({
          error: "Report generation service not available",
        });
      }

      for (const detail of pendingCommits) {
        try {
          const commit = await reportService.getCommitForReport(
            supabaseAdmin,
            detail.commitId,
            userId,
          );

          if (!commit) {
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "failed",
              null,
              "Commit not found",
            );
            continue;
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

          if (result.status === 202 && result.jobId) {
            await reportService.createReportJob(supabaseAdmin, {
              commitId: detail.commitId,
              userId,
              jobId: result.jobId,
              repoId: parsedRepoId,
              backfillId: backfill.id,
            });

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "processing",
              result.jobId,
            );
          } else if (result.status === 200 && result.cached) {
            await reportService.saveCachedReport(
              supabaseAdmin,
              detail.commitId,
              userId,
              result.data,
              { provider: "cached", generationType: "backfill" },
            );

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "completed",
            );
          }
        } catch (err) {
          await reportService.updateBackfillCommitStatus(
            supabaseAdmin,
            backfill.id,
            detail.commitId,
            "failed",
            null,
            err.message,
          );
        }
      }

      const updatedStatus = await reportService.getBackfillStatus(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      return res.json({
        message: `Retrying ${pendingCommits.length} failed reports`,
        backfill: {
          id: backfill.id,
          status: updatedStatus?.status || "processing",
          totalCommits: updatedStatus?.total_commits || backfill.total_commits,
          completedCommits: updatedStatus?.completed_commits || 0,
          failedCommits: updatedStatus?.failed_commits || 0,
          commitDetails: updatedStatus?.commit_details || [],
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to retry backfill" });
    }
  };

  const listRepoReports = async (req, res) => {
    try {
      const userId = req.userId;

      const { data: repos, error } = await supabaseAdmin
        .from("repos")
        .select("id, name, remote, enable_reports, updated_at")
        .eq("user_id", userId)
        .order("name");

      if (error) {
        return res.status(500).json({ error: "Failed to fetch repos" });
      }

      const { data: backfills } = await supabaseAdmin
        .from("backfill_jobs")
        .select(
          "repo_id, status, total_commits, completed_commits, failed_commits, commit_details, created_at, updated_at",
        )
        .eq("user_id", userId);

      const backfillMap = new Map();
      for (const b of backfills || []) {
        const recoveryMeta = await reportService.getBackfillRecoveryMetadata(
          supabaseAdmin,
          {
            backfill: b,
            userId,
            repoId: b.repo_id,
          },
        );

        backfillMap.set(b.repo_id, {
          status: b.status,
          totalCommits: b.total_commits,
          completedCommits: b.completed_commits,
          failedCommits: b.failed_commits,
          commitDetails: b.commit_details,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          lastProgressAt: recoveryMeta?.lastProgressAt || b.updated_at,
          nextRecoveryAt: recoveryMeta?.nextRecoveryAt || null,
          estimatedState: recoveryMeta?.estimatedState || b.status,
        });
      }

      const reposWithBackfill = (repos || []).map((repo) => ({
        ...repo,
        backfill: backfillMap.get(repo.id) || null,
      }));

      return res.json({ repos: reposWithBackfill });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch repos" });
    }
  };

  return {
    getBackfillStatus,
    retryBackfill,
    listRepoReports,
  };
}
