#!/bin/bash

set -e

echo "🚀 Quick Migration to Supabase"
echo "=============================="
echo ""

cd "$(dirname "$0")/.."

# Load environment variables to get project ref
if [ -f "packages/api/.env" ]; then
    export $(grep -v '^#' packages/api/.env | xargs)
fi

# Extract project ref from SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not found in packages/api/.env"
    exit 1
fi

PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not extract project ref from SUPABASE_URL"
    exit 1
fi

echo "📊 Project: $PROJECT_REF"
echo "🔗 URL: $SUPABASE_URL"
echo ""
echo "Step 1: Link to Supabase Project"
echo "=================================="
echo ""
echo "You'll need your database password from:"
echo "$SUPABASE_URL/project/$PROJECT_REF/settings/database"
echo ""

npx supabase@2 link --project-ref "$PROJECT_REF"

if [ $? -ne 0 ]; then
    echo "❌ Failed to link. Check your database password."
    exit 1
fi

echo ""
echo "✅ Linked successfully!"
echo ""
echo "Step 2: Push Migrations"
echo "========================"
echo ""

npx supabase@2 db push

if [ $? -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════"
    echo "✅ MIGRATION COMPLETE!"
    echo "════════════════════════════════════════"
    echo ""
    echo "🎉 Your schema is now in Supabase!"
    echo ""
    echo "📊 Verify your tables:"
    echo "   $SUPABASE_URL/project/$PROJECT_REF/editor"
    echo ""
    echo "🔄 Next steps:"
    echo "   1. Open VS Code"
    echo "   2. Run 'CommitDiary: Show My Commits'"
    echo "   3. Check API logs for '✅ [Supabase] Synced X commits'"
    echo ""
    echo "📖 Future migrations:"
    echo "   pnpm migration:new <name>  - Create new migration"
    echo "   pnpm db:push               - Push to Supabase"
    echo "   pnpm db:pull               - Pull from Supabase"
    echo ""
else
    echo ""
    echo "❌ Push failed. Check errors above."
    exit 1
fi
