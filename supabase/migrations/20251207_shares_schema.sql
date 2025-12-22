-- Shares schema for shareable commit diary views
-- Date: 2025-12-07

-- Shares table: stores share configurations
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scope JSONB NOT NULL DEFAULT '{}', -- { repos: ["repo1"], from: "date", to: "date" }
    token TEXT NOT NULL UNIQUE, -- public access token (8-12 chars)
    expires_at TIMESTAMPTZ, -- NULL = never expires
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_revoked ON shares(revoked);

-- Share snapshots: precomputed share data for performance
CREATE TABLE IF NOT EXISTS share_snapshots (
    share_id UUID PRIMARY KEY REFERENCES shares(id) ON DELETE CASCADE,
    payload JSONB NOT NULL, -- precomputed commit data
    total_commits INTEGER DEFAULT 0,
    total_repos INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share access logs: track access for rate limiting (token bucket)
CREATE TABLE IF NOT EXISTS share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_access_share_id ON share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_share_access_ip ON share_access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_share_access_time ON share_access_logs(accessed_at DESC);

-- Row Level Security for shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own shares
DROP POLICY IF EXISTS "Users can read own shares" ON shares;
CREATE POLICY "Users can read own shares" ON shares
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own shares" ON shares;
CREATE POLICY "Users can insert own shares" ON shares
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own shares" ON shares;
CREATE POLICY "Users can update own shares" ON shares
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own shares" ON shares;
CREATE POLICY "Users can delete own shares" ON shares
    FOR DELETE USING (user_id = auth.uid()::text);

-- Share snapshots follow share ownership
DROP POLICY IF EXISTS "Users can read own share snapshots" ON share_snapshots;
CREATE POLICY "Users can read own share snapshots" ON share_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shares WHERE shares.id = share_snapshots.share_id AND shares.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can insert own share snapshots" ON share_snapshots;
CREATE POLICY "Users can insert own share snapshots" ON share_snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shares WHERE shares.id = share_snapshots.share_id AND shares.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can update own share snapshots" ON share_snapshots;
CREATE POLICY "Users can update own share snapshots" ON share_snapshots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shares WHERE shares.id = share_snapshots.share_id AND shares.user_id = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Users can delete own share snapshots" ON share_snapshots;
CREATE POLICY "Users can delete own share snapshots" ON share_snapshots
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shares WHERE shares.id = share_snapshots.share_id AND shares.user_id = auth.uid()::text
        )
    );

-- Share access logs can be read by share owners
DROP POLICY IF EXISTS "Users can read own share access logs" ON share_access_logs;
CREATE POLICY "Users can read own share access logs" ON share_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shares WHERE shares.id = share_access_logs.share_id AND shares.user_id = auth.uid()::text
        )
    );

-- Auto-update updated_at on shares
DROP TRIGGER IF EXISTS update_shares_updated_at ON shares;
CREATE TRIGGER update_shares_updated_at BEFORE UPDATE ON shares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on share_snapshots
DROP TRIGGER IF EXISTS update_share_snapshots_updated_at ON share_snapshots;
CREATE TRIGGER update_share_snapshots_updated_at BEFORE UPDATE ON share_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old access logs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_access_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM share_access_logs
    WHERE accessed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: You can schedule this cleanup function to run periodically via pg_cron or external scheduler
