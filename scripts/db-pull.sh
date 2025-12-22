#!/bin/bash

set -e

echo "⬇️  Pulling Schema from Supabase"
echo "================================="
echo ""

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f "packages/api/.env" ]; then
    export $(grep -v '^#' packages/api/.env | xargs)
fi

PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co|\1|p')

# Check if linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "⚠️  Not linked to Supabase. Run this first:"
    echo "   ./scripts/migrate-now.sh"
    exit 1
fi

echo "Fetching remote schema..."
npx supabase@2 db pull

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema pulled and saved to supabase/migrations/"
    echo "📝 Review changes with: git diff supabase/"
else
    echo ""
    echo "❌ Pull failed. Check errors above."
    exit 1
fi
