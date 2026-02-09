/**
 * Cron Poller - Recovery-mode polling for missed webhook notifications
 *
 * This module runs at a REDUCED interval (15 minutes) to act as a safety net:
 * 1. Check pending jobs that haven't received webhook notifications
 * 2. Poll Stepper for job status as fallback
 * 3. Save completed reports that webhook delivery missed
 * 4. Handle failures and exponential backoff
 * 
 * NOTE: With webhooks enabled, this is a recovery mechanism only.
 * Most reports will be delivered via instant webhook callbacks.
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
 * Initialize the cron poller in recovery mode
 * @param {Object} options - Configuration options
 * @param {Object} options.supabase - Supabase admin client
 * @param {Object} options.stepper - Stepper instance (or null to use HTTP)
 * @param {string} options.stepperUrl - Stepper HTTP endpoint URL (if not using package)
 * @param {number} options.intervalMs - Polling interval in milliseconds (default: 15 minutes for recovery mode)
 */
export function initCronPoller({
  supabase,
  stepper,
  stepperUrl,
  intervalMs = 15 * 60 * 1000, // 15 minutes default (recovery mode)
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
  }
}

/**
 * Poll all pending jobs
 */
async function pollPendingJobs() {
  // Prevent concurrent polling
  if (isPolling) {
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
    
    // Log webhook recovery vs normal polling
  } catch (error) {
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
      return null;
    }
  } else {
    return null;
  }
}

/**
 * Manually trigger a poll cycle (for testing)
 */
export async function triggerPoll() {
  await pollPendingJobs();
}
