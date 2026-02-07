/**
 * Cron Poller - Polls pending report jobs and saves completed reports
 *
 * This module runs on a configurable interval to:
 * 1. Check pending jobs in report_jobs table
 * 2. Poll Stepper for job status
 * 3. Save completed reports to commit_reports table
 * 4. Handle failures and exponential backoff
 */

import {
  getPendingJobs,
  scheduleNextPoll,
  markJobFailed,
  completeJob,
  cleanupStaleJobs,
} from "../services/reportService.js";

// Polling state
let isPolling = false;
let pollIntervalId = null;
let stepperInstance = null;
let supabaseAdmin = null;

/**
 * Initialize the cron poller
 * @param {Object} options - Configuration options
 * @param {Object} options.supabase - Supabase admin client
 * @param {Object} options.stepper - Stepper instance (or null to use HTTP)
 * @param {string} options.stepperUrl - Stepper HTTP endpoint URL (if not using package)
 * @param {number} options.intervalMs - Polling interval in milliseconds (default: 2 minutes)
 */
export function initCronPoller({
  supabase,
  stepper,
  stepperUrl,
  intervalMs = 2 * 60 * 1000,
}) {
  supabaseAdmin = supabase;
  stepperInstance = stepper;

  // Start the polling loop
  pollIntervalId = setInterval(() => {
    pollPendingJobs();
  }, intervalMs);

  // Also run cleanup every hour
  setInterval(
    () => {
      cleanupStaleJobs(supabaseAdmin, 6); // 6 hour max
    },
    60 * 60 * 1000,
  );

  console.log(`🔄 Cron poller initialized (interval: ${intervalMs / 1000}s)`);

  // Run once immediately
  pollPendingJobs();
}

/**
 * Stop the cron poller
 */
export function stopCronPoller() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    console.log("🛑 Cron poller stopped");
  }
}

/**
 * Poll all pending jobs
 */
async function pollPendingJobs() {
  // Prevent concurrent polling
  if (isPolling) {
    console.log("⏳ Polling already in progress, skipping...");
    return;
  }

  isPolling = true;
  const startTime = Date.now();

  try {
    const pendingJobs = await getPendingJobs(supabaseAdmin, 50);

    if (pendingJobs.length === 0) {
      // No jobs to poll
      return;
    }

    console.log(`📋 Polling ${pendingJobs.length} pending jobs...`);

    // Process jobs in parallel with concurrency limit
    const results = await Promise.allSettled(
      pendingJobs.map((job) => pollSingleJob(job)),
    );

    // Count results
    const completed = results.filter(
      (r) => r.status === "fulfilled" && r.value === "completed",
    ).length;
    const failed = results.filter(
      (r) => r.status === "fulfilled" && r.value === "failed",
    ).length;
    const pending = results.filter(
      (r) => r.status === "fulfilled" && r.value === "pending",
    ).length;
    const errors = results.filter((r) => r.status === "rejected").length;

    const elapsed = Date.now() - startTime;
    console.log(
      `✅ Poll complete in ${elapsed}ms: ${completed} completed, ${failed} failed, ${pending} still pending, ${errors} errors`,
    );
  } catch (error) {
    console.error("Error in poll cycle:", error);
  } finally {
    isPolling = false;
  }
}

/**
 * Poll a single job
 * @param {Object} job - Job record from database
 * @returns {Promise<'completed'|'failed'|'pending'>}
 */
async function pollSingleJob(job) {
  try {
    // Check if job is too old (6+ hours)
    const ageMs = Date.now() - new Date(job.created_at).getTime();
    const maxAgeMs = 6 * 60 * 60 * 1000; // 6 hours

    if (ageMs > maxAgeMs) {
      await markJobFailed(
        supabaseAdmin,
        job.job_id,
        "Job timed out after 6 hours",
      );
      console.log(`⏰ Job ${job.job_id} timed out`);
      return "failed";
    }

    // Get job status from Stepper
    const status = await getJobFromStepper(job.job_id);

    if (!status) {
      // Job not found in Stepper - might have been processed
      // Check a few more times before giving up
      if (job.attempts < 5) {
        await scheduleNextPoll(supabaseAdmin, job.job_id, job.attempts + 1);
        return "pending";
      } else {
        await markJobFailed(
          supabaseAdmin,
          job.job_id,
          "Job not found in Stepper after multiple attempts",
        );
        return "failed";
      }
    }

    // Handle different job states
    switch (status.state) {
      case "completed":
        // Job completed successfully - save the report
        if (status.result) {
          const reportData = status.result.result || status.result;
          const metadata = {
            provider: status.result.usedProvider,
            generationTimeMs: status.result.timings?.totalMs,
          };

          const saveResult = await completeJob(
            supabaseAdmin,
            job.job_id,
            reportData,
            metadata,
          );

          if (saveResult.success) {
            console.log(`📝 Saved report for job ${job.job_id}`);
            return "completed";
          } else {
            await markJobFailed(
              supabaseAdmin,
              job.job_id,
              `Failed to save: ${saveResult.error}`,
            );
            return "failed";
          }
        } else {
          await markJobFailed(
            supabaseAdmin,
            job.job_id,
            "Job completed but no result data",
          );
          return "failed";
        }

      case "failed":
        // Job failed in Stepper
        await markJobFailed(
          supabaseAdmin,
          job.job_id,
          status.failedReason || "Unknown Stepper error",
        );
        console.log(`❌ Job ${job.job_id} failed: ${status.failedReason}`);
        return "failed";

      case "active":
      case "waiting":
      case "delayed":
      default:
        // Still processing - schedule next poll with backoff
        await scheduleNextPoll(supabaseAdmin, job.job_id, job.attempts + 1);
        return "pending";
    }
  } catch (error) {
    console.error(`Error polling job ${job.job_id}:`, error);
    // Don't mark as failed on transient errors, just schedule retry
    await scheduleNextPoll(supabaseAdmin, job.job_id, job.attempts + 1);
    return "pending";
  }
}

/**
 * Get job status from Stepper (package or HTTP)
 * @param {string} jobId - Stepper job ID
 * @returns {Promise<Object|null>}
 */
async function getJobFromStepper(jobId) {
  if (stepperInstance && typeof stepperInstance.getJob === "function") {
    // Works for both direct package import and our HTTP fallback object
    try {
      return await stepperInstance.getJob(jobId);
    } catch (err) {
      console.error(
        `[Stepper Poller] Error fetching job ${jobId}:`,
        err.message,
      );
      return null;
    }
  } else {
    console.warn("Stepper service not available for polling");
    return null;
  }
}

/**
 * Manually trigger a poll cycle (for testing)
 */
export async function triggerPoll() {
  await pollPendingJobs();
}
