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
