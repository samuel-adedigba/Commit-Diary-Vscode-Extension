-- Migration 003: Add generation_type to commit_reports and backfill_jobs table
-- This supports automatic backfill of 5 most recent commits when reports are enabled

-- Add generation_type column to commit_reports
ALTER TABLE commit_reports ADD COLUMN IF NOT EXISTS generation_type TEXT DEFAULT 'manual';
-- Values: 'auto' (new commits on sync), 'manual' (user triggered), 'backfill' (initial enable)

-- Add index for generation_type queries
CREATE INDEX IF NOT EXISTS idx_commit_reports_generation_type ON commit_reports(generation_type);

-- Backfill Jobs table (tracks repo-level backfill operations)
CREATE TABLE IF NOT EXISTS backfill_jobs (
    id SERIAL PRIMARY KEY,
    repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Overall status: pending, processing, completed, failed, partial
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Track individual commits in the backfill
    total_commits INTEGER NOT NULL DEFAULT 0,
    completed_commits INTEGER NOT NULL DEFAULT 0,
    failed_commits INTEGER NOT NULL DEFAULT 0,
    
    -- Details of which commits are being processed
    commit_details JSONB DEFAULT '[]'::jsonb,
    -- Format: [{ commitId, sha, status: 'pending'|'processing'|'completed'|'failed', jobId, error }]
    
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Only one active backfill per repo at a time
    UNIQUE(repo_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status ON backfill_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_repo_id ON backfill_jobs(repo_id);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_user_id ON backfill_jobs(user_id);

-- Enable RLS
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;

-- Backfill Jobs policies
CREATE POLICY "Users can read own backfill jobs" ON backfill_jobs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own backfill jobs" ON backfill_jobs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own backfill jobs" ON backfill_jobs
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own backfill jobs" ON backfill_jobs
    FOR DELETE USING (user_id = auth.uid()::text);

-- Trigger to update updated_at on backfill_jobs
CREATE TRIGGER update_backfill_jobs_updated_at BEFORE UPDATE ON backfill_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON backfill_jobs TO anon, authenticated;
GRANT USAGE ON SEQUENCE backfill_jobs_id_seq TO anon, authenticated;
