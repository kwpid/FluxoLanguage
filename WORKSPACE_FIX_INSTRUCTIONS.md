# Workspace Switching & Deletion Fix - Instructions

## What Was Fixed

Fixed two critical bugs affecting authenticated users:

1. **Workspace Switching Bug**: Switching workspaces showed a success message but you always stayed in Main Workspace
2. **Workspace Deletion Bug**: Deleting workspaces returned 400 Bad Request error
3. **QoL Improvement**: Creating a new workspace now automatically switches to it

## Why It Wasn't Working

The previous implementation used an in-memory cache to track which workspace was active. This failed because:
- In production (Render), different requests go to different server processes where the cache is empty
- Race conditions caused the cache to get out of sync even within a single process

## The Solution

The fix uses **database-backed persistence** instead of in-memory cache:
- Added an `is_current` column to the workspaces table
- Database trigger ensures only one workspace is marked as current per user
- All workspace operations (switch, create, delete) now update this flag in the database
- Your workspace selection persists across all requests and server restarts

## Required Action: Run SQL Migration

**You MUST run the SQL migration in your Supabase console for the fix to work.**

### Steps:

1. Open your Supabase Dashboard
2. Go to **SQL Editor** → **New query**
3. Copy and paste the entire contents of `supabase-migration-add-current-workspace.sql`
4. Click **Run**
5. You should see a success message: "✅ Migration completed: Added current workspace tracking"

### What the Migration Does:

- Adds `is_current` boolean column to workspaces table (defaults to false)
- Creates a database trigger to ensure only one workspace is current per user
- Sets your first/oldest workspace as current (if you already have workspaces)
- Creates an index for fast lookups

## How It Works Now

### Workspace Switching
- Click a workspace in the dropdown → updates `is_current = true` in database
- Trigger automatically sets all other workspaces to `is_current = false`
- Refreshing the page loads the workspace marked as current

### Workspace Creation
- Create new workspace → automatically sets `is_current = true`
- You're immediately switched to the new workspace (QoL improvement!)

### Workspace Deletion
- Delete non-current workspace → your active workspace stays the same
- Delete current workspace → automatically switches to the oldest remaining workspace
- Cannot delete your last workspace (safety check)

## Testing After Migration

Once you've run the SQL migration, test these scenarios:

1. **Switch Workspaces**: Switch to a different workspace, refresh the page - you should stay in that workspace
2. **Create Workspace**: Create "Test Workspace" - you should automatically be switched to it
3. **Delete Non-Current**: Switch to Main Workspace, delete Test Workspace - you should stay in Main Workspace
4. **Delete Current**: Delete the workspace you're currently in - you should be switched to another workspace

## Troubleshooting

**If workspace switching still doesn't work:**
- Make sure you ran the SQL migration in Supabase
- Check the Supabase SQL Editor for any errors when running the migration
- Clear your browser cache and refresh

**If you see database errors:**
- The migration is idempotent (safe to run multiple times)
- Make sure you have the latest version of `supabase-setup.sql` deployed first

## Files Modified

- `supabase-migration-add-current-workspace.sql` - New SQL migration (you need to run this!)
- `shared/database.types.ts` - Added is_current field
- `server/supabase-storage.ts` - Removed cache, uses database for current workspace
- `server/storage-factory.ts` - Removed ineffective Map-based cache
- `server/routes.ts` - Removed cache update calls

## Anonymous Users (No Login)

Anonymous users are NOT affected by this bug - they use in-memory storage which works fine.
This fix only applies to authenticated users using Supabase for storage.
