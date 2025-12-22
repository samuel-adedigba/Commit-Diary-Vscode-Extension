#!/bin/bash

set -e

echo "🚀 Pushing Schema to Supabase"
echo "=============================="
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

echo "1️⃣  Checking for schema differences..."
echo ""

npx supabase@2 db diff

echo ""
echo "────────────────────────────────────────"
echo "2️⃣  Push these changes to Supabase?"
echo "   Type 'yes' to continue, anything else to cancel"
echo "────────────────────────────────────────"
read -p "> " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "3️⃣  Pushing migrations..."
echo ""

npx supabase@2 db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema pushed successfully!"
    echo "🔗 View at: $SUPABASE_URL/project/$PROJECT_REF/editor"
else
    echo ""
    echo "❌ Push failed. Check errors above."
    exit 1
fi
