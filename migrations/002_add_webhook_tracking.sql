-- Migration: Add Webhook Tracking to Report Jobs
-- Adds columns to track webhook delivery status
-- Created: 2026-02-07

-- Add webhook tracking columns to report_jobs table
ALTER TABLE report_jobs 
ADD COLUMN IF NOT EXISTS webhook_delivered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS webhook_last_attempt_at TIMESTAMPTZ;

-- Create index for webhook monitoring queries
CREATE INDEX IF NOT EXISTS idx_report_jobs_webhook_status 
ON report_jobs(webhook_delivered, status);

-- Optional: Create webhook delivery log table for debugging
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
    id SERIAL PRIMARY KEY,
    job_id TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    delivered BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by job
CREATE INDEX IF NOT EXISTS idx_webhook_log_job_id 
ON webhook_delivery_log(job_id);

-- RLS policies for webhook_delivery_log (admin only)
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to avoid "already exists" error
DROP POLICY IF EXISTS webhook_log_admin_only ON webhook_delivery_log;

CREATE POLICY webhook_log_admin_only 
ON webhook_delivery_log 
FOR ALL 
USING (false); -- No public access, admin uses service role

COMMENT ON TABLE webhook_delivery_log IS 'Tracks webhook delivery attempts for debugging webhook failures';
COMMENT ON COLUMN report_jobs.webhook_delivered IS 'Whether the webhook notification was successfully delivered';
COMMENT ON COLUMN report_jobs.webhook_attempts IS 'Number of times webhook delivery was attempted';
COMMENT ON COLUMN report_jobs.webhook_last_attempt_at IS 'Timestamp of last webhook delivery attempt';
