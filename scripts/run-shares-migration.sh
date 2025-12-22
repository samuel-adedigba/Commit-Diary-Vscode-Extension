#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🚀 Shares Feature - Database Migration Guide          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "The tables 'shares', 'share_snapshots', and 'share_access_logs'"
echo "don't exist yet. Follow these steps to create them:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Open Supabase SQL Editor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/sql/new"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Run Migration 1 - Add Username Column"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 File: supabase/migrations/20251207_add_username.sql"
echo ""
echo "Press ENTER to copy Migration 1 SQL to clipboard..."
read

cat << 'EOF'
-- Add username field to users table for shareable URLs
-- Date: 2025-12-07

-- Add username column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Function to generate username from email (can be customized later)
CREATE OR REPLACE FUNCTION generate_username_from_email(email TEXT)
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Extract username from email (part before @)
    base_username := split_part(email, '@', 1);
    
    -- Remove special characters and convert to lowercase
    base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g'));
    
    -- Start with base username
    final_username := base_username;
    
    -- Check if username exists and append counter if needed
    WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Update existing users without username
UPDATE users
SET username = generate_username_from_email(email)
WHERE username IS NULL AND email IS NOT NULL;
EOF

echo ""
echo "✅ Copy the SQL above, paste into Supabase SQL Editor, and click RUN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Run Migration 2 - Create Shares Tables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 File: supabase/migrations/20251207_shares_schema.sql"
echo ""
echo "Press ENTER when Migration 1 is done to show Migration 2 SQL..."
read

echo ""
echo "🔽 Copy Migration 2 SQL below:"
echo ""

cat supabase/migrations/20251207_shares_schema.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Restart Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After both migrations succeed, restart the servers:"
echo ""
echo "  cd /home/blaze/mine/commitdiary"
echo "  pnpm dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Test the Feature"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Navigate to: http://localhost:3000/shares"
echo "2. Click 'Create Share'"
echo "3. Fill in the details and create"
echo "4. Copy the public link and test it"
echo ""
echo "✨ Done! The shares feature is now ready to use."
echo ""
