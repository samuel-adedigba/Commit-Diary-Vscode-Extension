#!/bin/bash

echo "🚀 Setting up Supabase Migrations (No Docker)"
echo "=============================================="
echo ""

# Install Supabase CLI if not already installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    echo ""
    
    # Install using Homebrew (macOS/Linux) or direct download
    if command -v brew &> /dev/null; then
        echo "Using Homebrew..."
        brew install supabase/tap/supabase
    else
        echo "Installing via direct download..."
        # For Linux
        curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
        sudo mv supabase /usr/local/bin/
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Supabase CLI"
        echo ""
        echo "   Install manually using one of these methods:"
        echo "   • Homebrew: brew install supabase/tap/supabase"
        echo "   • NPX: Use 'npx supabase' instead of 'supabase'"
        echo "   • Direct: https://github.com/supabase/cli#install-the-cli"
        echo ""
        echo "   Or use npx for this session: npx supabase --version"
        exit 1
    fi
    
    echo "✅ Supabase CLI installed"
else
    echo "✅ Supabase CLI already installed ($(supabase --version))"
fi

echo ""
echo "📁 Migration structure:"
echo "   supabase/migrations/ - Store all migration files here"
echo "   scripts/ - Helper scripts for database operations"
echo ""

# Check if already linked
if [ -f "supabase/.temp/project-ref" ]; then
    PROJECT_REF=$(cat supabase/.temp/project-ref)
    echo "✅ Already linked to project: $PROJECT_REF"
else
    echo "🔗 Linking to Supabase project..."
    echo ""
    echo "Run: supabase link --project-ref gzygnwdlomhettrbzlsg"
    echo ""
    echo "You'll be prompted for your database password."
    echo "Find it at: https://supabase.com/dashboard/project/gzygnwdlomhettrbzlsg/settings/database"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "1. Link to Supabase (if not done):"
echo "   supabase link --project-ref gzygnwdlomhettrbzlsg"
echo ""
echo "2. Push the initial schema:"
echo "   ./scripts/db-push.sh"
echo ""
echo "3. Create new migrations:"
echo "   ./scripts/migration-new.sh <name>"
