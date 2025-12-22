## ⚠️ IMPORTANT: Run Database Schema First

Before testing the migration, you **must** create the Supabase tables.

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/sql/new
2. You should see a blank SQL editor

### Step 2: Run the Schema

1. Open the file: `supabase-schema.sql` in this repository
2. **Copy the entire contents** (all SQL statements)
3. **Paste into the Supabase SQL Editor**
4. Click the **"Run"** button (or press Ctrl/Cmd + Enter)

### Step 3: Verify Tables Were Created

1. Go to: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/editor
2. Check that these tables exist:
   - ✅ `users`
   - ✅ `repos`
   - ✅ `commits`
   - ✅ `api_keys`
   - ✅ `telemetry`

### Step 4: Test the Migration

Once the tables are created, you can test:

#### Test 1: API Server
```bash
cd packages/api
node index.js
```

Expected output:
```
✅ Supabase client initialized
🚀 CommitDiary API running on port 3001
📊 Database: Supabase Postgres
```

#### Test 2: Extension Sync
1. Open VS Code with the CommitDiary extension
2. Open Command Palette (Cmd/Ctrl + Shift + P)
3. Run: "CommitDiary: Show My Commits"
4. Check API terminal for: `✅ [Supabase] Synced X new commits for user ...`

#### Test 3: Dashboard
1. Start dashboard: `cd packages/web-dashboard && pnpm dev`
2. Open http://localhost:3002
3. Sign in
4. Navigate to `/commits`
5. You should see your synced commits!

### Troubleshooting

**Error: "relation 'commits' does not exist"**
→ You forgot to run the SQL schema. Go back to Step 1.

**Error: "Failed to ingest commits"**
→ Check the API logs for detailed error messages.

**Dashboard shows no commits**
→ Make sure you ran "Show My Commits" in VS Code first to sync data.

---

## What Changed?

### ✅ Local SQLite → Supabase Postgres
- API now uses cloud database (Supabase)
- Extension still uses local SQLite (offline-first)
- Dashboard reads directly from Supabase (faster)

### ✅ Cross-Device Access
- Sync from laptop → View on desktop
- Sync from work computer → View from home
- All devices see the same data

### ✅ Future Features Enabled
- GitHub README widgets
- Public commit sharing
- Real-time collaboration
- Advanced analytics

### ⚠️ No Changes to Extension
- Extension code unchanged
- Still works 100% offline
- Local SQLite remains primary source
