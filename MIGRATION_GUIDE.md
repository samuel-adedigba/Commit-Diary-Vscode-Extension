# Migration to Supabase Postgres

## Overview
The API has been migrated from local SQLite to Supabase Postgres for cloud storage and cross-device access. The extension continues to use local SQLite (sql.js) as the primary source of truth.

## Architecture
- **Extension**: Uses local SQLite (sql.js) - Works 100% offline, local-first
- **API Server**: Uses Supabase Postgres - Enables cross-device sync
- **Dashboard**: Reads directly from Supabase Postgres - Real-time data access

## Setup Steps

### 1. Create Supabase Database Schema

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copy the contents of `supabase-schema.sql`
3. Paste and click "Run"
4. Verify tables were created in the Table Editor

### 2. Environment Variables

Ensure your API has the following in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

### 3. Start the API Server

```bash
cd packages/api
pnpm install  # Installs @supabase/supabase-js
node index.js
```

You should see:
```
✅ Supabase client initialized
🚀 CommitDiary API running on port 3001
📊 Database: Supabase Postgres
```

### 4. Test Extension Sync

1. Open VS Code with the extension
2. Run "CommitDiary: Show My Commits"
3. Check API logs for: `✅ [Supabase] Synced X new commits for user ...`

### 5. Test Dashboard

1. Start the dashboard: `cd packages/web-dashboard && pnpm dev`
2. Sign in with your Supabase account
3. Navigate to `/commits`
4. You should see your synced commits

## Key Changes

### API Changes
- Removed `better-sqlite3` dependency
- All database operations now use Supabase client
- Supports JSONB columns for `files`, `components`, `patterns`
- Row Level Security (RLS) enforces user data isolation

### Dashboard Changes
- Now reads directly from Supabase using `supabase.from('commits')`
- No longer uses API client for commit fetching
- Faster data access with RLS policies

### Extension
- **No changes required**
- Continues to use local SQLite
- Sync endpoint remains the same
- Gzip compression still works

## Benefits

✅ **Cross-device access**: View commits from any device  
✅ **Real-time updates**: Dashboard shows latest data instantly  
✅ **Scalability**: PostgreSQL handles large datasets efficiently  
✅ **Security**: RLS ensures users only see their own data  
✅ **Offline-first**: Extension works without internet  
✅ **Future features**: Enables GitHub README widgets, public sharing

## Rollback Plan

If you need to rollback to SQLite:

1. Restore `packages/api/index.js` from git history
2. Remove `@supabase/supabase-js` from dependencies
3. Re-install `better-sqlite3`
4. Restart API server

## Troubleshooting

### "Supabase client not initialized"
- Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart API server after updating `.env`

### "Failed to ingest commits"
- Run the SQL schema in Supabase
- Check API logs for detailed error messages
- Verify RLS policies are enabled

### Dashboard shows no commits
- Check browser console for errors
- Verify user is authenticated
- Check Supabase Table Editor to confirm commits exist

### API key validation fails
- Ensure `api_keys` table exists in Supabase
- Regenerate API key from dashboard
- Check API logs for authentication errors

## Migration Checklist

- [ ] Run `supabase-schema.sql` in Supabase SQL Editor
- [ ] Verify tables exist: `users`, `repos`, `commits`, `api_keys`, `telemetry`
- [ ] Update API `.env` with Supabase credentials
- [ ] Install `@supabase/supabase-js` in API package
- [ ] Restart API server
- [ ] Test extension sync (run "Show My Commits")
- [ ] Test dashboard commit view
- [ ] Verify cross-device access (sign in from different device)
- [ ] Test API key generation and validation
- [ ] Monitor logs for errors

## Next Steps

1. **Privacy Controls**: Add opt-in sync settings in extension
2. **PII Filtering**: Sanitize author emails and commit messages
3. **Export/Delete**: Enable GDPR-compliant data export and deletion
4. **GitHub Widgets**: Build public API for README badges
5. **Analytics**: Create metrics dashboard for commit patterns
