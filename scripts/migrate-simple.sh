#!/bin/bash

cd "$(dirname "$0")/.."

echo "🚀 Simplest Migration Approach"
echo "=============================="
echo ""
echo "1. Open this file:"
echo "   supabase/migrations/20251206153834_initial_schema.sql"
echo ""
echo "2. Copy all the SQL (Ctrl+A, Ctrl+C)"
echo ""
echo "3. Go to Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/sql/new"
echo ""
echo "4. Paste the SQL and click 'Run'"
echo ""
echo "✅ Done! No CLI, no tools, just copy-paste."
echo ""
echo "Want to see the SQL now? (y/n)"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat supabase/migrations/20251206153834_initial_schema.sql
fi
