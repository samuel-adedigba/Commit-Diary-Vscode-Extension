-- CommitDiary Initial Schema with RLS
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repos table
CREATE TABLE repos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    remote TEXT,
    last_synced_sha TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, remote)
);

-- Commits table
CREATE TABLE commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_name TEXT NOT NULL,
    sha TEXT NOT NULL,
    author_name TEXT,
    author_email TEXT,
    author_email_hash TEXT,
    date TIMESTAMPTZ NOT NULL,
    message TEXT,
    category TEXT,
    files_json JSONB,
    components_json JSONB,
    diff_summary TEXT,
    context_tags_json JSONB DEFAULT '[]'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, sha)
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Telemetry table (opt-in)
CREATE TABLE telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    data_json JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_commits_user_date ON commits(user_id, date DESC);
CREATE INDEX idx_commits_sha ON commits(sha);
CREATE INDEX idx_commits_category ON commits(user_id, category);
CREATE INDEX idx_commits_repo ON commits(user_id, repo_name);
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_repos_user ON repos(user_id);
CREATE INDEX idx_telemetry_user_event ON telemetry(user_id, event);

-- Enable Row Level Security
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repos
CREATE POLICY "Users can view their own repos"
    ON repos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repos"
    ON repos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repos"
    ON repos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repos"
    ON repos FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for commits
CREATE POLICY "Users can view their own commits"
    ON commits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own commits"
    ON commits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commits"
    ON commits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commits"
    ON commits FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
    ON api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
    ON api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
    ON api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
    ON api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for telemetry
CREATE POLICY "Users can view their own telemetry"
    ON telemetry FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own telemetry"
    ON telemetry FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Functions for common queries
CREATE OR REPLACE FUNCTION get_user_commit_stats(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_commits BIGINT,
    categories JSONB,
    top_components JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_commits,
        jsonb_agg(
            jsonb_build_object('category', category, 'count', cat_count)
        ) as categories,
        (
            SELECT jsonb_agg(comp_data)
            FROM (
                SELECT jsonb_build_object('component', component, 'count', comp_count) as comp_data
                FROM (
                    SELECT 
                        jsonb_array_elements_text(components_json) as component,
                        COUNT(*) as comp_count
                    FROM commits
                    WHERE user_id = p_user_id
                    AND (p_start_date IS NULL OR date >= p_start_date)
                    AND date <= p_end_date
                    GROUP BY component
                    ORDER BY comp_count DESC
                    LIMIT 20
                ) comp_sub
            ) comp_agg
        ) as top_components
    FROM (
        SELECT 
            category,
            COUNT(*) as cat_count
        FROM commits
        WHERE user_id = p_user_id
        AND (p_start_date IS NULL OR date >= p_start_date)
        AND date <= p_end_date
        GROUP BY category
    ) cat_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_commit_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE repos IS 'User repositories tracked by CommitDiary';
COMMENT ON TABLE commits IS 'Individual commit records with categorization and component detection';
COMMENT ON TABLE api_keys IS 'API keys for automation and CI/CD integration';
COMMENT ON TABLE telemetry IS 'Anonymous usage telemetry (opt-in)';
