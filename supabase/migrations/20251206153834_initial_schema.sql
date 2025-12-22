-- CommitDiary Supabase Schema
-- Run this in your Supabase SQL editor to create the database schema

-- Users table (minimal data, Supabase Auth handles the rest)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repos (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    remote TEXT,
    local_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, remote)
);

CREATE INDEX IF NOT EXISTS idx_repos_user_id ON repos(user_id);

-- Commits table
CREATE TABLE IF NOT EXISTS commits (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repo_id INTEGER REFERENCES repos(id) ON DELETE CASCADE,
    sha TEXT NOT NULL,
    message TEXT,
    category TEXT,
    author_name TEXT,
    author_email TEXT,
    date TIMESTAMPTZ,
    files JSONB,
    components JSONB,
    patterns JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_user_id ON commits(user_id);
CREATE INDEX IF NOT EXISTS idx_commits_sha ON commits(sha);
CREATE INDEX IF NOT EXISTS idx_commits_repo_id ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date DESC);
CREATE INDEX IF NOT EXISTS idx_commits_category ON commits(category);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Telemetry table (optional, for tracking sync operations)
CREATE TABLE IF NOT EXISTS telemetry (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_id ON telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry(created_at DESC);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Repos policies
DROP POLICY IF EXISTS "Users can read own repos" ON repos;
CREATE POLICY "Users can read own repos" ON repos
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own repos" ON repos;
CREATE POLICY "Users can insert own repos" ON repos
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own repos" ON repos;
CREATE POLICY "Users can update own repos" ON repos
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own repos" ON repos;
CREATE POLICY "Users can delete own repos" ON repos
    FOR DELETE USING (user_id = auth.uid()::text);

-- Commits policies
DROP POLICY IF EXISTS "Users can read own commits" ON commits;
CREATE POLICY "Users can read own commits" ON commits
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own commits" ON commits;
CREATE POLICY "Users can insert own commits" ON commits
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own commits" ON commits;
CREATE POLICY "Users can update own commits" ON commits
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own commits" ON commits;
CREATE POLICY "Users can delete own commits" ON commits
    FOR DELETE USING (user_id = auth.uid()::text);

-- API Keys policies
DROP POLICY IF EXISTS "Users can read own api_keys" ON api_keys;
CREATE POLICY "Users can read own api_keys" ON api_keys
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own api_keys" ON api_keys;
CREATE POLICY "Users can insert own api_keys" ON api_keys
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own api_keys" ON api_keys;
CREATE POLICY "Users can update own api_keys" ON api_keys
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own api_keys" ON api_keys;
CREATE POLICY "Users can delete own api_keys" ON api_keys
    FOR DELETE USING (user_id = auth.uid()::text);

-- Telemetry policies
DROP POLICY IF EXISTS "Users can read own telemetry" ON telemetry;
CREATE POLICY "Users can read own telemetry" ON telemetry
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own telemetry" ON telemetry;
CREATE POLICY "Users can insert own telemetry" ON telemetry
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on repos
DROP TRIGGER IF EXISTS update_repos_updated_at ON repos;
CREATE TRIGGER update_repos_updated_at BEFORE UPDATE ON repos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (run as service_role if needed)
-- These may already be handled by Supabase, but included for completeness
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
