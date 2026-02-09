# CommitDiary - Quick Setup Guide

## Prerequisites
- Node.js 18+
- pnpm 8+
- VS Code 1.75+
- Supabase account (for cloud sync)

## Step 1: Install Dependencies

```bash
# Install all dependencies
pnpm install
```

## Step 2: Build the Extension

```bash
# Build core package
pnpm --filter @commitdiary/core build

# Build extension
pnpm --filter commitdiary-extension build
```

## Step 3: Test Locally

### Option A: Run in VS Code Development Host
1. Open `packages/extension` in VS Code
2. Press `F5` to launch Extension Development Host
3. Test commands in Command Palette (`Cmd/Ctrl+Shift+P`)

### Option B: Install as VSIX
```bash
cd packages/extension
pnpm run package
code --install-extension commitdiary-extension-0.0.1.vsix
```

## Step 4: Configure Supabase (Optional - for Cloud Sync)

### 4.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and anon key

### 4.2 Run Migration
```bash
cd packages/api
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### 4.3 Enable OAuth
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable GitHub OAuth
3. Add callback URL: `vscode://samuel-adedigba.commitdiary-extension/auth-callback`

### 4.4 Configure Environment Variables

**API** (`packages/api/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
API_BASE_URL=http://localhost:3001

# Stepper Integration (AI Reports)
STEPPER_URL=http://localhost:3005
STEPPER_FORCE_HTTP=false

# Discord Error Monitoring (Optional)
DISCORD_ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

**Dashboard** (`packages/web-dashboard/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 5: Configure Discord Webhooks (Optional)

### For User Notifications
Users can configure their own Discord webhooks through the dashboard to receive commit report notifications:

1. **Create Discord Webhook**:
   - Open your Discord server
   - Go to **Server Settings** → **Integrations** → **Webhooks**
   - Click **New Webhook**
   - Name it (e.g., "CommitDiary Reports")
   - Select the channel for notifications
   - Click **Copy Webhook URL**

2. **Configure in Dashboard**:
   - Navigate to **Settings** → **Discord Notifications**
   - Paste your webhook URL
   - Select which events you want to receive:
     - `report_completed` - When AI report generation finishes
     - `report_failed` - When report generation fails
     - `backfill_started` - When backfill begins
     - `backfill_completed` - When backfill finishes
     - `sync_completed` - When commit sync completes
   - Click **Save Settings**
   - Click **Send Test** to verify

3. **Webhook Format**:
   - Reports are sent as rich Discord embeds
   - Include commit details, AI analysis, and metadata
   - HMAC-SHA256 signed for security

### For System Error Monitoring
Administrators can configure a centralized Discord webhook for API/dashboard errors:

1. Create a dedicated Discord channel for error monitoring
2. Create a webhook for that channel
3. Add to API `.env`:
   ```env
   DISCORD_ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/your-error-webhook
   ```
4. Restart the API server
5. Critical errors will be automatically sent to this webhook

## Step 6: Run API Server (Optional)

```bash
cd packages/api
pnpm run dev
```

API will start on http://localhost:3001

## Step 6: Run Dashboard (Optional)

```bash
cd packages/web-dashboard
pnpm run dev
```

Dashboard will start on http://localhost:3000

## Step 7: Use the Extension

### Basic Usage (No Cloud Sync)
1. Open a Git repository in VS Code
2. Run: `CommitDiary: Show My Commits`
3. Run: `CommitDiary: Show Commit Metrics`

### With Cloud Sync
1. Run: `CommitDiary: Login to Cloud`
2. Authenticate via browser
3. Enable sync in settings: `"commitDiary.sync.enabled": true`
4. Run: `CommitDiary: Sync Now`

## Troubleshooting

### Extension not loading
- Check VS Code Output → CommitDiary
- Ensure WASM file exists: `packages/extension/wasm/sql-wasm.wasm`
- Rebuild: `pnpm --filter commitdiary-extension build`

### Database errors
- Check: `~/.config/Code/User/globalStorage/samuel-adedigba.commitdiary-extension/`
- Delete `commitdiary.sqlite` to reset
- Re-run: `CommitDiary: Show My Commits`

### Sync failing
- Verify API is running
- Check authentication: `CommitDiary: Login to Cloud`
- Verify settings: `commitDiary.sync.apiUrl`
- Check API logs

### OAuth callback not working
- Verify redirect URI in Supabase Dashboard
- Must match: `vscode://samuel-adedigba.commitdiary-extension/auth-callback`
- Check VS Code URI handler registration

## Configuration Examples

### Minimal (Local Only)
```json
{
  "commitDiary.user.emails": ["you@example.com"],
  "commitDiary.defaultTimeRange": "1 year"
}
```

### Full Setup (Cloud Sync)
```json
{
  "commitDiary.user.emails": ["you@example.com"],
  "commitDiary.defaultTimeRange": "1 year",
  "commitDiary.sync.enabled": true,
  "commitDiary.sync.autoInterval": "daily",
  "commitDiary.sync.apiUrl": "https://api.commitdiary.com",
  "commitDiary.sync.includeEmails": false,
  "commitDiary.componentRules": [
    { "pattern": "^src/components/", "name": "Components" },
    { "pattern": "^src/api/", "name": "API" },
    { "pattern": "^tests/", "name": "Tests" }
  ],
  "commitDiary.telemetry.enabled": false
}
```

## Next Steps

- 📖 Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture details
- 🐛 Report issues on GitHub
- 🚀 Deploy API to production (Vercel/Railway/Fly.io)
- 🎨 Customize component detection rules
- 📊 Explore metrics and analytics

## Need Help?

- Check logs: VS Code Output → CommitDiary
- API logs: `packages/api/` console
- Database: `~/.config/Code/User/globalStorage/.../commitdiary.sqlite`

---

Happy tracking! 🎉
