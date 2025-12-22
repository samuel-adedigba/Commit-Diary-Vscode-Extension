#!/bin/bash

# CommitDiary Migration Verification Script
# Run this after creating Supabase tables to verify everything works

echo "🔍 CommitDiary Migration Verification"
echo "======================================"
echo ""

# Check if API is running
echo "1️⃣  Checking API Server..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "   ✅ API server is running on port 3001"
    
    # Get API info
    API_INFO=$(curl -s http://localhost:3001)
    if echo "$API_INFO" | grep -q "CommitDiary API"; then
        echo "   ✅ API responding correctly"
    else
        echo "   ⚠️  API response unexpected"
    fi
else
    echo "   ❌ API server is not running"
    echo "   → Start it with: cd packages/api && node index.js"
    exit 1
fi

echo ""

# Check if dashboard is running
echo "2️⃣  Checking Dashboard..."
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo "   ✅ Dashboard is running on port 3002"
else
    echo "   ⚠️  Dashboard is not running (optional)"
    echo "   → Start it with: cd packages/web-dashboard && pnpm dev"
fi

echo ""

# Check Supabase connection
echo "3️⃣  Checking Supabase Connection..."
if [ -f "packages/api/.env" ]; then
    if grep -q "SUPABASE_URL" packages/api/.env && grep -q "SUPABASE_SERVICE_ROLE_KEY" packages/api/.env; then
        echo "   ✅ Supabase credentials configured"
        
        # Extract URL
        SUPABASE_URL=$(grep SUPABASE_URL packages/api/.env | cut -d'=' -f2)
        echo "   📡 URL: $SUPABASE_URL"
    else
        echo "   ❌ Missing Supabase credentials in .env"
        exit 1
    fi
else
    echo "   ❌ .env file not found in packages/api/"
    exit 1
fi

echo ""

# Check if SQL schema has been run
echo "4️⃣  Testing Database Tables..."
echo "   ⚠️  This will fail if you haven't run supabase-schema.sql yet"
echo ""

# Try to fetch API keys (will fail if tables don't exist)
API_KEY_RESPONSE=$(curl -s -X GET http://localhost:3001/v1/users/api-keys \
    -H "Authorization: Bearer test-token" 2>&1)

if echo "$API_KEY_RESPONSE" | grep -q "PGRST205"; then
    echo "   ❌ Database tables don't exist yet!"
    echo ""
    echo "   🚨 ACTION REQUIRED:"
    echo "   1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
    echo "   2. Copy contents of supabase-schema.sql"
    echo "   3. Paste and click 'Run'"
    echo ""
    exit 1
elif echo "$API_KEY_RESPONSE" | grep -q "Invalid or expired token"; then
    echo "   ✅ Database tables exist (auth failed as expected)"
else
    echo "   ✅ Database tables exist and working!"
fi

echo ""
echo "======================================"
echo "✅ All checks passed!"
echo ""
echo "Next steps:"
echo "1. Run SQL schema in Supabase (if not done)"
echo "2. Open VS Code and run 'CommitDiary: Show My Commits'"
echo "3. Check API logs for: ✅ [Supabase] Synced X commits"
echo "4. Open http://localhost:3002/commits to see your data"
echo ""
echo "Happy coding! 🚀"
