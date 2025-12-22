# Run Shares Feature Migrations

## Quick Start - Copy & Paste Method

**Two new migration files need to be run in Supabase SQL Editor:**

1. `supabase/migrations/20251207_add_username.sql` - Adds username field to users table
2. `supabase/migrations/20251207_shares_schema.sql` - Creates shares, share_snapshots, and share_access_logs tables

## Steps

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/sql/new

### 2. Run Migration 1 - Add Username

Copy the content of `supabase/migrations/20251207_add_username.sql` and paste into SQL Editor, then click **Run**.

This migration:
- Adds `username` column to `users` table
- Creates a function to generate usernames from email addresses
- Updates existing users with auto-generated usernames

### 3. Run Migration 2 - Shares Schema

Copy the content of `supabase/migrations/20251207_shares_schema.sql` and paste into SQL Editor, then click **Run**.

This migration creates:
- `shares` table - stores share configurations with tokens, expiry, scope
- `share_snapshots` table - cached/precomputed share data for performance
- `share_access_logs` table - tracks access for rate limiting
- Row Level Security policies for all tables
- Triggers for auto-updating timestamps
- Cleanup function for old access logs

### 4. Verify Installation

After running both migrations, you can verify with:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('shares', 'share_snapshots', 'share_access_logs');

-- Check username column exists
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username';
```

### 5. Restart Services

After migrations are complete:

```bash
cd /home/blaze/mine/commitdiary
pnpm dev
```

Then in a new terminal:

```bash
cd /home/blaze/mine/commitdiary/packages/web-dashboard
pnpm dev
```

## Features Enabled

After migrations:

✅ Create shareable commit diary links
✅ Server-side pagination (50 commits per page)
✅ Token bucket rate limiting (100 requests per share+IP, refills 10/min)
✅ Export shares as Markdown or CSV
✅ Public share view at `/s/:username/:token`
✅ Share management dashboard at `/shares`

## API Endpoints

- `POST /v1/shares` - Create share
- `GET /v1/shares` - List user's shares
- `DELETE /v1/shares/:shareId` - Revoke share
- `GET /s/:username/:token` - Public share view (paginated)
- `GET /v1/shares/:shareId/export?format=md|csv` - Export share

## Usage

1. Navigate to **Shares** in the dashboard sidebar
2. Click **Create Share**
3. Configure scope (repos, date range, expiry)
4. Copy the generated public link
5. Share with anyone or embed in GitHub README
