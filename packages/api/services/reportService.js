/**
 * Report Service - Handles commit report generation and job tracking
 *
 * This service manages:
 * - Report generation triggering via Stepper
 * - Job tracking for async AI responses
 * - Report storage and retrieval
 * - Repo-level report toggle
 */

/**
 * Check if reports are enabled for a repository
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} repoId - Repository ID
 * @returns {Promise<boolean>}
 */
export async function isReportsEnabled(supabaseAdmin, repoId) {
  const { data, error } = await supabaseAdmin
    .from("repos")
    .select("enable_reports")
    .eq("id", repoId)
    .single();

  if (error) {
    console.error("Error checking reports enabled:", error);
    return false;
  }

  return data?.enable_reports === true;
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
  const { data, error } = await supabaseAdmin
    .from("repos")
    .update({ enable_reports: enabled })
    .eq("id", repoId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error toggling reports:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return {
      success: false,
      error: "Repository not found or not owned by user",
    };
  }

  return { success: true };
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
    console.error("Error creating report job:", error);
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
    console.error("Error fetching pending jobs:", error);
    return [];
  }

  return data || [];
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
    console.error("Error scheduling next poll:", error);
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
  const { error } = await supabaseAdmin
    .from("report_jobs")
    .update({
      status: "failed",
      error_message: errorMessage,
      last_polled_at: new Date().toISOString(),
    })
    .eq("job_id", jobId);

  if (error) {
    console.error("Error marking job failed:", error);
  }
}

/**
 * Complete a job and save the report
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {string} jobId - Stepper job ID
 * @param {Object} reportData - The generated report data
 * @param {Object} metadata - Additional metadata (provider, timing, etc.)
 */
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
    console.error("Error finding job to complete:", jobError);
    return { success: false, error: "Job not found" };
  }

  // Start transaction-like operation
  // 1. Insert the report
  const { error: reportError } = await supabaseAdmin
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
      },
      {
        onConflict: "commit_id",
      },
    );

  if (reportError) {
    console.error("Error saving report:", reportError);
    return { success: false, error: reportError.message };
  }

  // 2. Delete the job (it's complete)
  const { error: deleteError } = await supabaseAdmin
    .from("report_jobs")
    .delete()
    .eq("job_id", jobId);

  if (deleteError) {
    console.error("Error deleting completed job:", deleteError);
    // Job is complete but not cleaned up - not critical
  }

  console.log(`✅ Report saved for job ${jobId}, commit ${job.commit_id}`);
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
  const { data, error } = await supabaseAdmin
    .from("commit_reports")
    .select("*")
    .eq("commit_id", commitId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      // Not found is ok
      console.error("Error fetching report:", error);
    }
    return null;
  }

  return data;
}

/**
 * Get job status for a commit
 * @param {Object} supabaseAdmin - Supabase admin client
 * @param {number} commitId - Commit ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function getJobStatus(supabaseAdmin, commitId, userId) {
  const { data, error } = await supabaseAdmin
    .from("report_jobs")
    .select("*")
    .eq("commit_id", commitId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching job status:", error);
    }
    return null;
  }

  return data;
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
    console.error("Error cleaning up stale jobs:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`🧹 Cleaned up ${data.length} stale jobs`);
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
  console.log(`[SERVICE DEBUG] Fetching commit ${commitId} for user ${userId}`);
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
    console.error(
      `[SERVICE ERROR] Commit fetch failed for ${commitId}:`,
      error,
    );
    return null;
  }

  return data;
}
