/**
 * Report Service - Handles commit report generation and job tracking
 *
 * This service manages:
 * - Report generation triggering via Stepper
 * - Job tracking for async AI responses
 * - Report storage and retrieval
 * - Repo-level report toggle
 */

import * as discordAlerts from "../alerts/discord.js";

/**
 * Handle network/timeout errors with graceful degradation
 * @param {Error} error - The error object
 * @param {string} operation - Operation name for logging
 * @returns {Object} - { isNetworkError: boolean, message?: string }
 */
function handleNetworkError(error, operation) {
  if (
    error?.message?.includes("fetch failed") ||
    error?.message?.includes("timeout") ||
    error?.message?.includes("ETIMEDOUT") ||
    error?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return {
      isNetworkError: true,
      message: "Database temporarily unavailable",
    };
  }
  return { isNetworkError: false };
}

/**
 * Check if reports are enabled for a repository
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @returns {Promise<boolean>}
 */
export async function isReportsEnabled(supabaseAdmin, repoId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("repos")
      .select("enable_reports")
      .eq("id", repoId)
      .single();

    if (error) {
      const networkError = handleNetworkError(error, "isReportsEnabled");
      if (networkError.isNetworkError) {
        return false; // Default to disabled on network error
      }
      return false;
    }

    return data?.enable_reports === true;
  } catch (error) {
    const networkError = handleNetworkError(error, "isReportsEnabled");
    if (networkError.isNetworkError) {
      return false;
    }
    throw error;
  }
}

/**
 * Toggle reports for a repository
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID (for ownership check)
 * @param {boolean} enabled - Whether to enable or disable
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleReports(supabaseAdmin, repoId, userId, enabled) {
  try {
    const { data, error } = await supabaseAdmin
      .from("repos")
      .update({ enable_reports: enabled })
      .eq("id", repoId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      const networkError = handleNetworkError(error, "toggleReports");
      if (networkError.isNetworkError) {
        return { success: false, error: networkError.message };
      }
      return { success: false, error: error.message };
    }

    if (!data) {
      return {
        success: false,
        error: "Repository not found or not owned by user",
      };
    }

    return { success: true };
  } catch (error) {
    const networkError = handleNetworkError(error, "toggleReports");
    if (networkError.isNetworkError) {
      return { success: false, error: networkError.message };
    }
    throw error;
  }
}

/**
 * Create a report job entry for tracking
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {Object} params - Job parameters
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function createReportJob(
  supabaseAdmin,
  { commitId, userId, jobId },
) {
  if (!jobId) {
    return { success: false, error: "jobId is required" };
  }

  // Check if there's already an active job for this commit
  const { data: existingJob } = await supabaseAdmin
    .from("report_jobs")
    .select("id, job_id, status")
    .eq("commit_id", commitId)
    .eq("status", "pending")
    .single();

  if (existingJob) {
    // Return existing job ID if there's already a pending job
    return { success: true, jobId: existingJob.job_id, existing: true };
  }

  // Create new job entry
  const { data, error } = await supabaseAdmin
    .from("report_jobs")
    .insert({
      commit_id: commitId,
      user_id: userId,
      job_id: jobId,
      status: "pending",
      next_poll_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === "23505") {
      return { success: true, jobId, existing: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true, jobId: data.job_id };
}

/**
 * Get pending jobs that are ready to be polled
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} limit - Maximum jobs to fetch
 * @returns {Promise<Array>}
 */
export async function getPendingJobs(supabaseAdmin, limit = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from("report_jobs")
      .select(
        `
        id,
        commit_id,
        user_id,
        job_id,
        status,
        attempts,
        created_at
      `,
      )
      .eq("status", "pending")
      .lte("next_poll_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      const networkError = handleNetworkError(error, "getPendingJobs");
      if (networkError.isNetworkError) {
        return [];
      }
      return [];
    }

    return data || [];
  } catch (error) {
    const networkError = handleNetworkError(error, "getPendingJobs");
    if (networkError.isNetworkError) {
      return [];
    }
    return [];
  }
}

/**
 * Update job polling metadata
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} jobId - Stepper job ID
 * @param {number} attempts - Current attempt count
 */
export async function scheduleNextPoll(supabaseAdmin, jobId, attempts) {
  const nextPollAt = calculateNextPollTime(attempts);

  const { error } = await supabaseAdmin
    .from("report_jobs")
    .update({
      attempts: attempts,
      last_polled_at: new Date().toISOString(),
      next_poll_at: nextPollAt.toISOString(),
    })
    .eq("job_id", jobId);

  if (error) {
  }
}

/**
 * Calculate next poll time with exponential backoff
 * @param {number} attempts - Number of attempts so far
 * @returns {Date} - Next poll time
 */
function calculateNextPollTime(attempts) {
  // Base: 2 minutes, max: 30 minutes
  const baseMs = 2 * 60 * 1000;
  const maxMs = 30 * 60 * 1000;
  const backoffMs = Math.min(baseMs * Math.pow(1.5, attempts), maxMs);
  return new Date(Date.now() + backoffMs);
}

/**
 * Mark job as failed
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} jobId - Stepper job ID
 * @param {string} errorMessage - Error message
 */
export async function markJobFailed(supabaseAdmin, jobId, errorMessage) {
  // Get the job info first
  const { data: job } = await supabaseAdmin
    .from("report_jobs")
    .select("commit_id, user_id")
    .eq("job_id", jobId)
    .single();

  const { error } = await supabaseAdmin
    .from("report_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      last_polled_at: new Date().toISOString(),
    })
    .eq("job_id", jobId);

  if (error) {
  }

  // Send Discord webhook notification if user has it configured
  if (job) {
    try {
      // Get user's webhook settings
      const { data: webhookSettings } = await supabaseAdmin
        .from("user_webhook_settings")
        .select("*")
        .eq("user_id", job.user_id)
        .eq("enabled", true)
        .single();

      if (webhookSettings) {
        // Check if user has subscribed to report_failed events
        const events = webhookSettings.events || [];
        if (events.includes("report_failed")) {
          // Get commit details
          const { data: commit } = await supabaseAdmin
            .from("commits")
            .select("*")
            .eq("id", job.commit_id)
            .single();

          if (commit) {
            // Send webhook event
            discordAlerts.sendUserWebhookEvent({
              userId: job.user_id,
              webhookUrl: webhookSettings.discord_webhook_url,
              webhookSecret: webhookSettings.webhook_secret,
              eventType: "report_failed",
              data: {
                message: "Report generation failed",
                commit: commit,
                error: errorMessage,
                jobId: jobId,
              },
              supabase: supabaseAdmin,
            });

          }
        }
      }
    } catch (webhookError) {
      // Don't fail if webhook fails
    }
  }
}

/**
 * Complete a job and save the report
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} jobId - Stepper job ID
 * @param {Object} reportData - The generated report data
 * @param {Object} metadata - Additional metadata (provider, timing, etc.)
 */
/**
 * Save a cached report directly (without a job)
 * Used when Stepper returns an immediate cache hit
 */
export async function saveCachedReport(
  supabaseAdmin,
  commitId,
  userId,
  reportData,
  metadata = {},
) {
  const { error: reportError } = await supabaseAdmin
    .from("commit_reports")
    .upsert(
      {
        commit_id: commitId,
        user_id: userId,
        title: reportData.title,
        summary: reportData.summary,
        changes: reportData.changes || [],
        rationale: reportData.rationale,
        impact_and_tests: reportData.impact_and_tests,
        next_steps: reportData.next_steps || [],
        tags: reportData.tags,
        provider_used: metadata.provider || "cached",
        generation_time_ms: metadata.generationTimeMs || null,
        template_used: metadata.template || "default",
        generation_type: metadata.generationType || "manual",
      },
      {
        onConflict: "commit_id",
      },
    );

  if (reportError) {
    return { success: false, error: reportError.message };
  }
  return { success: true };
}

export async function completeJob(
  supabaseAdmin,
  jobId,
  reportData,
  metadata = {},
) {
  // Get the job info first
  const { data: job, error: jobError } = await supabaseAdmin
    .from("report_jobs")
    .select("commit_id, user_id")
    .eq("job_id", jobId)
    .single();

  if (jobError || !job) {
    return { success: false, error: "Job not found" };
  }

  // Start transaction-like operation
  // 1. Insert the report
  const { data: savedReport, error: reportError } = await supabaseAdmin
    .from("commit_reports")
    .upsert(
      {
        commit_id: job.commit_id,
        user_id: job.user_id,
        title: reportData.title,
        summary: reportData.summary,
        changes: reportData.changes || [],
        rationale: reportData.rationale,
        impact_and_tests: reportData.impact_and_tests,
        next_steps: reportData.next_steps || [],
        tags: reportData.tags,
        provider_used: metadata.provider || "unknown",
        generation_time_ms: metadata.generationTimeMs || null,
        template_used: metadata.template || "default",
        generation_type: metadata.generationType || "manual",
      },
      {
        onConflict: "commit_id",
      },
    )
    .select()
    .single();

  if (reportError) {
    return { success: false, error: reportError.message };
  }

  // 2. Delete the job (it's complete)
  const { error: deleteError } = await supabaseAdmin
    .from("report_jobs")
    .delete()
    .eq("job_id", jobId);

  if (deleteError) {
    // Job is complete but not cleaned up - not critical
  }

  // 3. Send Discord webhook notification if user has it configured
  try {
    // Get user's webhook settings
    const { data: webhookSettings } = await supabaseAdmin
      .from("user_webhook_settings")
      .select("*")
      .eq("user_id", job.user_id)
      .eq("enabled", true)
      .single();

    if (webhookSettings) {
      // Check if user has subscribed to report_completed events
      const events = webhookSettings.events || [];
      if (events.includes("report_completed")) {
        // Get commit details for the Discord embed
        const { data: commit } = await supabaseAdmin
          .from("commits")
          .select("*")
          .eq("id", job.commit_id)
          .single();

        if (commit && savedReport) {
          // Send webhook event
          discordAlerts.sendUserWebhookEvent({
            userId: job.user_id,
            webhookUrl: webhookSettings.discord_webhook_url,
            webhookSecret: webhookSettings.webhook_secret,
            eventType: "report_completed",
            data: {
              report: savedReport,
              commit: commit,
            },
            supabase: supabaseAdmin,
          });

        }
      }
    }
  } catch (webhookError) {
    // Don't fail the job if webhook fails
  }

  return { success: true };
}

/**
 * Get report for a specific commit
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} commitId - Commit ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getReport(supabaseAdmin, commitId, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("commit_reports")
      .select("*")
      .eq("commit_id", commitId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // Not found is ok
        const networkError = handleNetworkError(error, "getReport");
        if (!networkError.isNetworkError) {
        }
      }
      return null;
    }

    return data;
  } catch (error) {
    const networkError = handleNetworkError(error, "getReport");
    if (networkError.isNetworkError) {
      return null;
    }
    throw error;
  }
}

/**
 * Get job status for a commit
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} commitId - Commit ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getJobStatus(supabaseAdmin, commitId, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("report_jobs")
      .select("*")
      .eq("commit_id", commitId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        const networkError = handleNetworkError(error, "getJobStatus");
        if (!networkError.isNetworkError) {
        }
      }
      return null;
    }

    return data;
  } catch (error) {
    const networkError = handleNetworkError(error, "getJobStatus");
    if (networkError.isNetworkError) {
      return null;
    }
    throw error;
  }
}

/**
 * Cleanup old failed/stale jobs
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} maxAgeHours - Maximum age for pending jobs (default 6 hours)
 */
export async function cleanupStaleJobs(supabaseAdmin, maxAgeHours = 6) {
  const cutoffTime = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000,
  ).toISOString();

  // Mark very old pending jobs as failed
  const { data, error } = await supabaseAdmin
    .from("report_jobs")
    .update({
      status: "failed",
      error_message: `Job timed out after ${maxAgeHours} hours`,
    })
    .eq("status", "pending")
    .lt("created_at", cutoffTime)
    .select("job_id");

  if (error) {
    return;
  }

  if (data && data.length > 0) {
  }
}

/**
 * Get commit details needed for report generation
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} commitId - Commit ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getCommitForReport(supabaseAdmin, commitId, userId) {
  const { data, error } = await supabaseAdmin
    .from("commits")
    .select(
      `
      id,
      sha,
      message,
      author_name,
      files,
      components,
      repo_id,
      repos(name, remote)
    `,
    )
    .eq("id", commitId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

// ==================== BACKFILL FUNCTIONS ====================

/** System-wide constant: max commits to auto-generate on enable */
export const AUTO_REPORT_LIMIT = 5;

/**
 * Get the N most recent commits for a repo that don't have reports yet
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @param {number} limit - Max commits to return
 * @returns {Promise<Array>}
 */
export async function getRecentCommitsWithoutReports(
  supabaseAdmin,
  repoId,
  userId,
  limit = AUTO_REPORT_LIMIT,
) {
  try {
    // Get commits for this repo, sorted by date desc, that don't have reports
    const { data: commits, error } = await supabaseAdmin
      .from("commits")
      .select(
        `
        id,
        sha,
        message,
        author_name,
        files,
        components,
        diff_summary,
        date,
        repo_id,
        repos(name, remote)
      `,
      )
      .eq("repo_id", repoId)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit * 3); // Fetch more to filter out those with reports

    if (error) {
      return [];
    }

    if (!commits || commits.length === 0) return [];

    // Check which of these commits already have reports
    const commitIds = commits.map((c) => c.id);
    const { data: existingReports, error: reportsError } = await supabaseAdmin
      .from("commit_reports")
      .select("commit_id")
      .in("commit_id", commitIds);

    if (reportsError) {
      return [];
    }

    const reportedCommitIds = new Set(
      (existingReports || []).map((r) => r.commit_id),
    );

    // Also check for pending jobs
    const { data: pendingJobs, error: jobsError } = await supabaseAdmin
      .from("report_jobs")
      .select("commit_id")
      .in("commit_id", commitIds)
      .eq("status", "pending");

    const pendingCommitIds = new Set(
      (pendingJobs || []).map((j) => j.commit_id),
    );

    // Filter to only commits without reports and without pending jobs
    const unreportedCommits = commits.filter(
      (c) => !reportedCommitIds.has(c.id) && !pendingCommitIds.has(c.id),
    );

    return unreportedCommits.slice(0, limit);
  } catch (error) {
    return [];
  }
}

/**
 * Create a backfill job to track the backfill operation for a repo
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @param {Array} commits - Commits to backfill
 * @returns {Promise<{success: boolean, backfillId?: number, error?: string}>}
 */
export async function createBackfillJob(
  supabaseAdmin,
  repoId,
  userId,
  commits,
) {
  try {
    const commitDetails = commits.map((c) => ({
      commitId: c.id,
      sha: c.sha,
      status: "pending",
      jobId: null,
      error: null,
    }));

    // Delete any existing backfill job for this repo (allows retry)
    await supabaseAdmin
      .from("backfill_jobs")
      .delete()
      .eq("repo_id", repoId)
      .eq("user_id", userId);

    const { data, error } = await supabaseAdmin
      .from("backfill_jobs")
      .insert({
        repo_id: repoId,
        user_id: userId,
        status: "processing",
        total_commits: commits.length,
        completed_commits: 0,
        failed_commits: 0,
        commit_details: commitDetails,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, backfillId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update a single commit's status within a backfill job
 * Also updates overall backfill status when all commits are done
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} backfillId - Backfill job ID
 * @param {number} commitId - Commit ID
 * @param {string} status - New status: 'processing', 'completed', 'failed'
 * @param {string} jobId - Stepper job ID (if enqueued)
 * @param {string} errorMsg - Error message (if failed)
 */
export async function updateBackfillCommitStatus(
  supabaseAdmin,
  backfillId,
  commitId,
  status,
  jobId = null,
  errorMsg = null,
) {
  try {
    // Get current backfill job
    const { data: backfill, error: fetchError } = await supabaseAdmin
      .from("backfill_jobs")
      .select("*")
      .eq("id", backfillId)
      .single();

    if (fetchError || !backfill) {
      return;
    }

    // Update the specific commit in commit_details
    const details = backfill.commit_details.map((d) => {
      if (d.commitId === commitId) {
        return { ...d, status, jobId: jobId || d.jobId, error: errorMsg };
      }
      return d;
    });

    // Calculate completed/failed counts
    const completedCount = details.filter(
      (d) => d.status === "completed",
    ).length;
    const failedCount = details.filter((d) => d.status === "failed").length;
    const totalDone = completedCount + failedCount;

    // Determine overall status
    let overallStatus = "processing";
    if (totalDone === backfill.total_commits) {
      if (failedCount === 0) {
        overallStatus = "completed";
      } else if (completedCount === 0) {
        overallStatus = "failed";
      } else {
        overallStatus = "partial";
      }
    }
    
    const { error: updateError } = await supabaseAdmin
      .from("backfill_jobs")
      .update({
        commit_details: details,
        completed_commits: completedCount,
        failed_commits: failedCount,
        status: overallStatus,
        error_message:
          failedCount > 0
            ? `${failedCount} of ${backfill.total_commits} reports failed`
            : null,
      })
      .eq("id", backfillId);

    if (updateError) {
    }

    // If all completed successfully, enable reports for the repo
    if (overallStatus === "completed") {
      const { error: enableError } = await supabaseAdmin
        .from("repos")
        .update({ enable_reports: true })
        .eq("id", backfill.repo_id)
        .eq("user_id", backfill.user_id);
      
      if (enableError) {
      }
    }
  } catch (error) {
  }
}

/**
 * Get backfill status for a repository
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getBackfillStatus(supabaseAdmin, repoId, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("backfill_jobs")
      .select("*")
      .eq("repo_id", repoId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Get failed commits from a backfill job for retry
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - List of failed commit details
 */
export async function getFailedBackfillCommits(supabaseAdmin, repoId, userId) {
  const backfill = await getBackfillStatus(supabaseAdmin, repoId, userId);
  if (!backfill) return [];

  return (backfill.commit_details || []).filter((d) => d.status === "failed");
}

/**
 * Update backfill job to mark it as retrying (reset failed commits to pending)
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, backfill?: Object, error?: string}>}
 */
export async function resetBackfillForRetry(supabaseAdmin, repoId, userId) {
  try {
    const backfill = await getBackfillStatus(supabaseAdmin, repoId, userId);
    if (!backfill) {
      return { success: false, error: "No backfill job found" };
    }

    if (backfill.status !== "failed" && backfill.status !== "partial") {
      return {
        success: false,
        error: `Cannot retry backfill in '${backfill.status}' state`,
      };
    }

    // Reset failed commits to pending
    const details = backfill.commit_details.map((d) => {
      if (d.status === "failed") {
        return { ...d, status: "pending", jobId: null, error: null };
      }
      return d;
    });

    const failedCount = details.filter((d) => d.status === "pending").length;

    const { data, error } = await supabaseAdmin
      .from("backfill_jobs")
      .update({
        commit_details: details,
        failed_commits: 0,
        status: "processing",
        error_message: null,
      })
      .eq("id", backfill.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, backfill: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if a repo has an active backfill (processing) and should skip enabling
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function hasActiveBackfill(supabaseAdmin, repoId, userId) {
  const backfill = await getBackfillStatus(supabaseAdmin, repoId, userId);
  return backfill && backfill.status === "processing";
}
