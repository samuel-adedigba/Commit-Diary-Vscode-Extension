-- Migration: Add Commit Reports System
-- Run this on Supabase to add the async commit report tables
-- Created: 2026-01-28

-- ==================== ADD ENABLE_REPORTS TO REPOS ====================

-- Add enable_reports column to repos table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'repos' AND column_name = 'enable_reports'
    ) THEN
        ALTER TABLE repos ADD COLUMN enable_reports BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'commits' AND column_name = 'diff_summary'
    ) THEN
        ALTER TABLE commits ADD COLUMN diff_summary TEXT;
    END IF;
END $$;

-- ==================== COMMIT REPORTS TABLE ====================

-- Commit Reports table (stores AI-generated reports)
CREATE TABLE IF NOT EXISTS commit_reports (
    id SERIAL PRIMARY KEY,
    commit_id INTEGER NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Report content (matches Stepper ReportOutput)
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    changes JSONB DEFAULT '[]'::jsonb,
    rationale TEXT,
    impact_and_tests TEXT,
    next_steps JSONB DEFAULT '[]'::jsonb,
    tags TEXT,
    
    -- Metadata
    provider_used TEXT,
    generation_time_ms INTEGER,
    template_used TEXT DEFAULT 'default',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(commit_id)
);

-- Indexes for commit_reports
CREATE INDEX IF NOT EXISTS idx_commit_reports_commit_id ON commit_reports(commit_id);
CREATE INDEX IF NOT EXISTS idx_commit_reports_user_id ON commit_reports(user_id);

-- ==================== REPORT JOBS TABLE ====================

-- Report Jobs table (tracks pending AI job requests)
CREATE TABLE IF NOT EXISTS report_jobs (
    id SERIAL PRIMARY KEY,
    commit_id INTEGER NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job tracking
    job_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Polling metadata
    attempts INTEGER DEFAULT 0,
    last_polled_at TIMESTAMPTZ,
    next_poll_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Error tracking
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(commit_id)
);

-- Indexes for report_jobs
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_job_id ON report_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_next_poll ON report_jobs(next_poll_at) WHERE status = 'pending';

-- ==================== RLS POLICIES ====================

-- Enable RLS on new tables
ALTER TABLE commit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own reports" ON commit_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON commit_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON commit_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON commit_reports;

DROP POLICY IF EXISTS "Users can read own jobs" ON report_jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON report_jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON report_jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON report_jobs;

-- Commit Reports policies
CREATE POLICY "Users can read own reports" ON commit_reports
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own reports" ON commit_reports
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own reports" ON commit_reports
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own reports" ON commit_reports
    FOR DELETE USING (user_id = auth.uid()::text);

-- Report Jobs policies
CREATE POLICY "Users can read own jobs" ON report_jobs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own jobs" ON report_jobs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own jobs" ON report_jobs
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own jobs" ON report_jobs
    FOR DELETE USING (user_id = auth.uid()::text);

-- ==================== TRIGGERS ====================

-- Create update trigger for commit_reports (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_commit_reports_updated_at'
    ) THEN
        CREATE TRIGGER update_commit_reports_updated_at 
        BEFORE UPDATE ON commit_reports
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create update trigger for report_jobs (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_jobs_updated_at'
    ) THEN
        CREATE TRIGGER update_report_jobs_updated_at 
        BEFORE UPDATE ON report_jobs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ==================== DONE ====================
-- Migration complete! The following was added:
-- 1. repos.enable_reports column
-- 2. commit_reports table with RLS
-- 3. report_jobs table with RLS
-- 4. Update triggers for both tables
