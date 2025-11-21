-- ================================================
-- MIGRATION: Add current workspace tracking
-- ================================================
-- This migration adds support for tracking which workspace is currently active for each user
--Run this SQL in your Supabase SQL Editor after running the initial setup
-- ================================================

-- Add is_current column to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Create index for faster current workspace queries
CREATE INDEX IF NOT EXISTS idx_workspaces_user_current 
ON workspaces(user_id, is_current) 
WHERE is_current = true;

-- Function to ensure only one workspace is current per user
CREATE OR REPLACE FUNCTION ensure_one_current_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a workspace as current, unset all others for this user
  IF NEW.is_current = true THEN
    UPDATE workspaces 
    SET is_current = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain one current workspace per user
DROP TRIGGER IF EXISTS ensure_one_current_workspace_trigger ON workspaces;
CREATE TRIGGER ensure_one_current_workspace_trigger
  BEFORE INSERT OR UPDATE ON workspaces
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION ensure_one_current_workspace();

-- Set the first workspace as current for each user (migration data fix)
WITH first_workspaces AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM workspaces
  ORDER BY user_id, created_at
)
UPDATE workspaces w
SET is_current = true
FROM first_workspaces fw
WHERE w.id = fw.id;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Added current workspace tracking';
  RAISE NOTICE 'Added is_current column and trigger to maintain one current workspace per user';
END $$;
