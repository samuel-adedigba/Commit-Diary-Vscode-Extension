#!/bin/bash

set -e

echo "📊 Database Status"
echo "=================="
echo ""

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f "packages/api/.env" ]; then
    export $(grep -v '^#' packages/api/.env | xargs)
fi

PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')

# Check if linked
if [ -f "supabase/.temp/project-ref" ]; then
    echo "✅ Linked to project: $PROJECT_REF"
    echo "🔗 URL: $SUPABASE_URL"
else
    echo "⚠️  Not linked to Supabase"
    echo "   Run: ./scripts/migrate-now.sh"
    exit 1
fi

echo ""
echo "📁 Local migrations:"
ls -1 supabase/migrations/ 2>/dev/null | wc -l | xargs echo "   Files:"

echo ""
echo "🔍 Checking schema differences..."
npx supabase@2 db diff

echo ""
echo "💡 Quick commands:"
echo "   ./scripts/migration-new.sh <name>  - Create new migration"
echo "   ./scripts/db-push.sh               - Push to Supabase"
echo "   ./scripts/db-pull.sh               - Pull from Supabase"
echo "   npx supabase@2 db diff             - Show differences"
