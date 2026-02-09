# Discord Webhooks Setup Guide

## Overview

CommitDiary uses two independent Discord webhook systems for monitoring:

1. **Stepper Error Alerts** - Monitors Stepper service errors and exceptions
2. **API Error Alerts** - Monitors API service errors and exceptions

Both are **completely optional** and **independent** - you can enable either, both, or neither.

---

## 1. Get Discord Webhook URLs

### Steps:
1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it (e.g., "Stepper Alerts", "API Alerts")
5. Choose the channel where alerts should post
6. Click **Copy Webhook URL**

### You'll get a URL like:
```
https://discord.com/api/webhooks/123456789/abcdefghijklmnop
```

---

## 2. Configure Stepper (.env)

Create or edit `packages/stepper/.env`:

```env
# Stepper Error Webhook (Optional)
# Alerts on: LLM API failures, queue errors, worker crashes, timeouts
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnop

# LLM API Keys (Required for report generation)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

**Status when running:**
```
✅ Stepper error webhook configured - alerts enabled
```

---

## 3. Configure API (.env)

Create or edit `packages/api/.env`:

```env
# Existing config...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
STEPPER_URL=http://localhost:3005
API_BASE_URL=http://localhost:3001
WEBHOOK_SECRET=your-secret-here

# API Error Webhook (Optional)
# Alerts on: 500 errors, unhandled exceptions, promise rejections
DISCORD_ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/987654321/zyxwvutsrqponmlk
```

**Status when running:**
```
📬 Webhook Systems:
   ✅ User Report Webhooks: Enabled (callback endpoint: POST /v1/stepper/callback)
   ✅ API Error Alerts: Enabled (Discord webhook configured)
```

If not configured:
```
   ℹ️  API Error Alerts: Disabled (set DISCORD_ERROR_WEBHOOK_URL to enable)
```

---

## 4. (Optional) Configure Web Dashboard

Web Dashboard does **NOT** have a Discord webhook. Errors are logged to console/logs.

Edit `packages/web-dashboard/.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Webhook Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   STEPPER SERVICE                          │
│  (Generates commit reports using LLM)                      │
└────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
         Success/Result          Error/Exception
                │                       │
                ▼                       ▼
        Call Callbacks          Discord Error Webhook
        /v1/stepper/callback     (DISCORD_WEBHOOK_URL)
                │
                ▼
        ┌────────────────────────────────────────┐
        │    API SERVICE                         │
        │  /v1/stepper/callback endpoint         │
        └────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    Send Discord   Save to Database
    User Webhook   (if available)
   (per-user)
        │
        ▼
    User's Discord Channel


        API Service Errors
            │
            ▼
        Discord Error Webhook
        (DISCORD_ERROR_WEBHOOK_URL)
            │
            ▼
        API Admin Channel
```

---

## Testing

### Test Stepper Webhook (optional)

```bash
# With webhook configured, any Stepper error will send a Discord message
# Simulate an error by:
1. Setting ANTHROPIC_API_KEY to invalid value
2. Triggering a report generation
3. Check Discord channel for error alert
```

### Test API Webhook (optional)

```bash
# With webhook configured, any API error will send a Discord message
# Simulate an error by:
1. Stopping the database
2. Triggering an API endpoint
3. Check Discord channel for 500 error alert
```

### Test User Report Notification

```bash
# In Dashboard Settings > Discord Webhooks
# Click "Test Webhook" button
# Should see test message in Discord
```

---

## Error Messages

### Stepper Startup
```
✅ Stepper error webhook configured - alerts enabled
```
→ Webhook is set, alerts will fire

```
ℹ️  DISCORD_WEBHOOK_URL not configured
```
→ No alerts will be sent (expected if you don't need them)

### API Startup
```
✅ API Error Alerts: Enabled (Discord webhook configured)
```
→ API errors will post to Discord

```
ℹ️  API Error Alerts: Disabled (set DISCORD_ERROR_WEBHOOK_URL to enable)
```
→ API errors will only be logged to console

---

## What Gets Logged

### Stepper → Discord
- LLM API timeouts
- Rate limiting errors
- Queue processing failures
- Worker crashes
- Unhandled exceptions in Stepper

### API → Discord
- HTTP 500 errors
- Unhandled promise rejections
- Uncaught exceptions
- Critical startup errors (e.g., DB connection failure)

### Users → Discord (optional per-user)
- Report generation completed
- Report generation failed
- Backfill operations
- Custom events (if configured)

---

## Best Practices

1. **Use different channels** for Stepper alerts and API alerts (easier to monitor)
2. **Use same webhook** for both if monitoring single channel (Discord allows this)
3. **Test webhooks** before going to production
4. **Monitor Discord channel** for alerts - don't ignore them
5. **Keep webhook URLs secret** - they allow posting to your Discord server

---

## Troubleshooting

**No alerts appearing in Discord?**
1. Check webhook URL is correct (copy again from Discord)
2. Verify DISCORD_WEBHOOK_URL (Stepper) or DISCORD_ERROR_WEBHOOK_URL (API) is set
3. Check the configured channel exists and has messages enabled
4. Trigger an error to test (e.g., invalid API key)

**Too many alerts?**
1. Check application logs for the root cause
2. Fix the issue (e.g., invalid credentials, database down)
3. Webhooks will stop firing once issue is resolved

**Webhook URL expired?**
1. Delete the webhook in Discord
2. Create a new one
3. Update the environment variable
4. Restart the service

---

## Summary

| System | Env Variable | Purpose | Example URL |
|--------|-------------|---------|-------------|
| Stepper | `DISCORD_WEBHOOK_URL` | Error monitoring | `https://discord.com/api/webhooks/...` |
| API | `DISCORD_ERROR_WEBHOOK_URL` | Error monitoring | `https://discord.com/api/webhooks/...` |
| User Reports | Database | Notification delivery | User-configured |

All optional. All independent. No cross-dependencies.
