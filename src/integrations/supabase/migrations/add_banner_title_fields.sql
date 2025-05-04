
-- Add banner_url and title fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS title text;
