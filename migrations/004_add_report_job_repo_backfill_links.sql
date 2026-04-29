-- Migration 004: Link report_jobs to repo/backfill for deterministic lifecycle handling
-- Created: 2026-04-29

ALTER TABLE report_jobs
ADD COLUMN IF NOT EXISTS repo_id INTEGER REFERENCES repos(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS backfill_id INTEGER REFERENCES backfill_jobs(id) ON DELETE SET NULL;

-- Backfill repo_id from existing commits where possible
UPDATE report_jobs rj
SET repo_id = c.repo_id
FROM commits c
WHERE c.id = rj.commit_id
  AND rj.repo_id IS NULL;

-- Helpful indexes for webhook/recovery lookups
CREATE INDEX IF NOT EXISTS idx_report_jobs_repo_status ON report_jobs(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_backfill_status ON report_jobs(backfill_id, status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_user_repo_status ON report_jobs(user_id, repo_id, status);

COMMENT ON COLUMN report_jobs.repo_id IS 'Repository owning the report job; used for backfill-safe linkage';
COMMENT ON COLUMN report_jobs.backfill_id IS 'Optional backfill_jobs.id this report job belongs to';
