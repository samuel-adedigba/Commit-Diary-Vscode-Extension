-- User Webhook Settings Migration
-- Allows users to configure their own Discord webhooks for receiving commit reports

-- Create user_webhook_settings table
CREATE TABLE IF NOT EXISTS user_webhook_settings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Discord webhook configuration
    discord_webhook_url TEXT NOT NULL,
    webhook_secret TEXT NOT NULL,  -- Auto-generated secret for HMAC verification
    enabled BOOLEAN DEFAULT true,
    
    -- Event subscriptions (JSONB array)
    events JSONB DEFAULT '[
        "report_completed",
        "report_failed",
        "backfill_started",
        "backfill_completed",
        "backfill_failed",
        "sync_completed",
        "repo_enabled"
    ]'::jsonb,
    
    -- Webhook delivery tracking
    last_delivery_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)  -- One webhook config per user
);

CREATE INDEX IF NOT EXISTS idx_user_webhook_settings_user_id ON user_webhook_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhook_settings_enabled ON user_webhook_settings(enabled) WHERE enabled = true;

-- Webhook delivery log for debugging and monitoring
CREATE TABLE IF NOT EXISTS user_webhook_delivery_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    webhook_settings_id INTEGER NOT NULL REFERENCES user_webhook_settings(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    
    -- Delivery details
    status_code INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    attempt INTEGER DEFAULT 1,
    response_body TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_webhook_delivery_log_user_id ON user_webhook_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhook_delivery_log_webhook_settings_id ON user_webhook_delivery_log(webhook_settings_id);
CREATE INDEX IF NOT EXISTS idx_user_webhook_delivery_log_created_at ON user_webhook_delivery_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_webhook_delivery_log_event_type ON user_webhook_delivery_log(event_type);

-- Enable RLS on new tables
ALTER TABLE user_webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_webhook_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_webhook_settings
DROP POLICY IF EXISTS "Users can read own webhook settings" ON user_webhook_settings;
CREATE POLICY "Users can read own webhook settings" ON user_webhook_settings
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own webhook settings" ON user_webhook_settings;
CREATE POLICY "Users can insert own webhook settings" ON user_webhook_settings
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own webhook settings" ON user_webhook_settings;
CREATE POLICY "Users can update own webhook settings" ON user_webhook_settings
    FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own webhook settings" ON user_webhook_settings;
CREATE POLICY "Users can delete own webhook settings" ON user_webhook_settings
    FOR DELETE USING (user_id = auth.uid()::text);

-- RLS Policies for user_webhook_delivery_log
DROP POLICY IF EXISTS "Users can read own webhook logs" ON user_webhook_delivery_log;
CREATE POLICY "Users can read own webhook logs" ON user_webhook_delivery_log
    FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own webhook logs" ON user_webhook_delivery_log;
CREATE POLICY "Users can insert own webhook logs" ON user_webhook_delivery_log
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Trigger to update updated_at on user_webhook_settings
DROP TRIGGER IF EXISTS update_user_webhook_settings_updated_at ON user_webhook_settings;
CREATE TRIGGER update_user_webhook_settings_updated_at BEFORE UPDATE ON user_webhook_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old delivery logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM user_webhook_delivery_log
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_webhook_settings IS 'User-configured Discord webhooks for receiving commit report notifications';
COMMENT ON TABLE user_webhook_delivery_log IS 'Webhook delivery history for debugging and monitoring';
COMMENT ON COLUMN user_webhook_settings.events IS 'Array of event types user wants to receive: report_completed, report_failed, backfill_started, backfill_completed, backfill_failed, sync_completed, repo_enabled';
COMMENT ON COLUMN user_webhook_settings.webhook_secret IS 'Auto-generated secret for HMAC-SHA256 signature verification';
