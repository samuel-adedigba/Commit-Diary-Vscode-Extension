-- Add diff_summary column to commits table
-- Used for storing a summary of changes in the commit

ALTER TABLE commits 
ADD COLUMN IF NOT EXISTS diff_summary TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_commits_diff_summary ON commits(diff_summary);

-- Add comment for documentation
COMMENT ON COLUMN commits.diff_summary IS 'Summary of file changes and modifications in this commit';
