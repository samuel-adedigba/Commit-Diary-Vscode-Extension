export function createJobsController({ supabaseAdmin, getStepper, reportService }) {
  const getJobStatus = async (req, res) => {
    try {
      const { jobId } = req.params;

      const { data: job, error } = await supabaseAdmin
        .from("report_jobs")
        .select("*")
        .eq("job_id", jobId)
        .single();

      if (error || !job) {
        return res.json({
          status: "not_found",
          message:
            "Job not found. It may have completed - check the commit report.",
        });
      }

      const stepper = getStepper?.() || null;
      let stepperStatus = null;
      if (stepper) {
        try {
          stepperStatus = await stepper.getJob(jobId);
        } catch (e) {}
      }

      return res.json({
        status: job.status,
        jobId: job.job_id,
        commitId: job.commit_id,
        attempts: job.attempts,
        createdAt: job.created_at,
        lastPolledAt: job.last_polled_at,
        nextPollAt: job.next_poll_at,
        errorMessage: job.error_message,
        stepperState: stepperStatus?.state || null,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch job status" });
    }
  };

  const recoverJobs = async (req, res) => {
    try {
      const results = await reportService.recoverStuckJobs(supabaseAdmin, 4);

      return res.json({
        success: true,
        message: "Job recovery completed",
        results: {
          recovered: results.recovered,
          failed: results.failed,
          errors: results.errors,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Job recovery failed", message: error.message });
    }
  };

  return {
    getJobStatus,
    recoverJobs,
  };
}
