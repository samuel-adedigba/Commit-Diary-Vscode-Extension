# 🚀 Quick Start: Migrate to Supabase (2 Steps!)

## Step 1: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/settings/database
2. Look for **"Database Password"** section
3. Click **"Reset Database Password"** if you don't have it
4. **Copy the password** (you'll need it in 30 seconds)

## Step 2: Run the Migration

```bash
cd /home/blaze/mine/commitdiary
./scripts/migrate-now.sh
```

**That's it!** 

When prompted, paste your database password.

The script will:
- ✅ Link to your Supabase project
- ✅ Push all migrations
- ✅ Create tables: `users`, `repos`, `commits`, `api_keys`, `telemetry`
- ✅ Set up Row Level Security policies

Takes ~30 seconds.

---

## Verify It Worked

### Check Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/editor
2. You should see 5 tables ✅

### Test the Sync
1. Open VS Code
2. Run: "CommitDiary: Show My Commits"
3. Check API logs: `✅ [Supabase] Synced X commits`

### View Your Data
1. Open dashboard: http://localhost:3002/commits
2. Sign in
3. See your commits! 🎉

---

## Troubleshooting

**"Failed to link"**
- Check you pasted the correct database password
- Password is NOT the same as your Supabase account password

**"Tables already exist"**
- That's fine! The migration is idempotent (safe to run multiple times)

**"Command not found: npx"**
- Install Node.js first: https://nodejs.org

---

## What's Next?

### Create New Migrations (Future Schema Changes)

```bash
# 1. Create a new migration
./scripts/migration-new.sh add_new_column

# 2. Edit the file that was created
# Add your SQL: ALTER TABLE commits ADD COLUMN ...

# 3. Push to Supabase
./scripts/db-push.sh
```

### Pull Schema from Supabase

```bash
# If someone else made changes in Supabase
./scripts/db-pull.sh
```

### Check Migration Status

```bash
# See what would change before pushing
./scripts/db-status.sh
```

---

## Why This Approach?

✅ **No Docker** - Uses npx, works instantly  
✅ **Version Control** - All migrations in git  
✅ **Safe** - Preview changes before applying  
✅ **Local Testing** - Test SQL locally before pushing  
✅ **Team Ready** - Multiple devs can collaborate  

---

## Files Created

```
supabase/
└── migrations/
    └── 20251206153834_initial_schema.sql   ← Your initial schema

scripts/
├── migrate-now.sh        ← Quick migration (run this!)
├── migration-new.sh      ← Create new migration
├── db-push.sh            ← Push to Supabase
├── db-pull.sh            ← Pull from Supabase
├── db-status.sh          ← Check status
└── README.md             ← Detailed docs
```

---

## Ready to Go!

Run this now:

```bash
./scripts/migrate-now.sh
```

Your commits will appear in Supabase in 30 seconds! 🚀
