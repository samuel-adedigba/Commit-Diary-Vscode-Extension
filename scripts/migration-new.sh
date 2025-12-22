#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/migration-new.sh <migration_name>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/migration-new.sh add_tags_column"
    echo "  ./scripts/migration-new.sh create_analytics_table"
    exit 1
fi

cd "$(dirname "$0")/.."

echo "📝 Creating new migration: $1"
echo ""

npx supabase@2 migration new "$1"

echo ""
echo "✅ Migration created!"
echo "📝 Edit the file in supabase/migrations/"
echo ""
echo "🔍 Check changes:"
echo "   npx supabase@2 db diff"
echo ""
echo "🚀 Push to Supabase:"
echo "   ./scripts/db-push.sh"
