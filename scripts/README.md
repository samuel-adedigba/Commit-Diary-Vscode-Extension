# Database Migration Scripts

Manage your Supabase database schema safely with these migration scripts.

## Setup (One-time)

```bash
# Quick migration (recommended - no CLI installation needed!)
./scripts/migrate-now.sh

# This will:
# 1. Link to your Supabase project (asks for DB password)
# 2. Push all migrations
# 3. Create the tables in Supabase
```

**That's it!** No installation required, uses `npx` behind the scenes.

## Daily Workflow

### Creating a New Migration

```bash
# Create a new migration file
./scripts/migration-new.sh add_new_feature

# Edit the generated file
# Example: supabase/migrations/20251206153834_add_new_feature.sql

# Push to Supabase
./scripts/db-push.sh
```

### Checking Database Status

```bash
# See current state and differences
./scripts/db-status.sh
```

### Pulling Remote Changes

```bash
# Pull schema from Supabase to local
./scripts/db-pull.sh
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `setup-migrations.sh` | Install Supabase CLI and create structure |
| `db-push.sh` | Push local migrations to Supabase |
| `db-pull.sh` | Pull remote schema from Supabase |
| `migration-new.sh` | Create a new migration file |
| `db-status.sh` | Check database status and diff |

## Migration File Structure

```
supabase/
├── migrations/
│   ├── 20251206153834_initial_schema.sql
│   ├── 20251207120000_add_tags.sql
│   └── 20251208140000_add_analytics.sql
└── .temp/
    └── project-ref (auto-generated)
```

## Example: Adding a Column

```bash
# 1. Create migration
./scripts/migration-new.sh add_commit_tags

# 2. Edit the file (example content):
# ALTER TABLE commits ADD COLUMN tags JSONB DEFAULT '[]';
# CREATE INDEX idx_commits_tags ON commits USING GIN (tags);

# 3. Check what will change
./scripts/db-status.sh

# 4. Push to Supabase
./scripts/db-push.sh
```

## Benefits

✅ **Version Control** - All schema changes tracked in git  
✅ **Safety** - Preview changes before applying  
✅ **No Docker** - Uses Supabase CLI directly  
✅ **Simple** - Bash scripts, no complex tools  
✅ **Rollback** - Git history tracks all changes  

## Troubleshooting

### "Not linked to Supabase"
```bash
supabase link --project-ref gzygnwdlomhettrbzlsg
```

### "Command not found: supabase"
```bash
npm install -g supabase
```

### "Permission denied"
```bash
chmod +x scripts/*.sh
```

## Next Steps

After initial setup, your workflow is:
1. Edit code/schema
2. Run `./scripts/migration-new.sh <name>`
3. Edit the SQL file
4. Run `./scripts/db-push.sh`
5. Commit to git

No manual SQL Editor copy-pasting needed! 🎉
