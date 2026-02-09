# 🔧 Environment Variables Configuration Guide

## ✅ Summary: No Hardcoded URLs!

All URLs in your project are properly configured using environment variables with sensible defaults for development. Here's the complete breakdown:

---

## 📦 Package: web-dashboard

**File:** `packages/web-dashboard/.env.example`

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:3001
# DASHBOARD_URL=http://localhost:3000  # Optional
```

### Usage in Code:

| File | Variable | Usage |
|------|----------|-------|
| `lib/supabaseClient.ts` | `NEXT_PUBLIC_SUPABASE_URL` | Supabase connection |
| `lib/supabaseClient.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase auth |
| `lib/apiClient.ts` | `NEXT_PUBLIC_API_URL` | API server endpoint |
| `next.config.js` | `NEXT_PUBLIC_API_URL` | CSP header configuration |

### Production Example:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://api.commitdiary.com
```

---

## 📦 Package: api

**File:** `packages/api/.env.example`

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
DASHBOARD_URL=http://localhost:3000
PUBLIC_URL=http://localhost:3000

# Stepper Integration
STEPPER_URL=http://localhost:3005
STEPPER_FORCE_HTTP=true

# API Base URL (for webhook callbacks)
API_BASE_URL=http://localhost:3001

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-here
```

### Usage in Code:

| File | Variable | Purpose | Default |
|------|----------|---------|---------|
| `index.js:138` | `SUPABASE_URL` | Database connection | *Required* |
| `index.js:139` | `SUPABASE_SERVICE_ROLE_KEY` | Admin access | *Required* |
| `index.js:74` | `PORT` | Server port | `3001` |
| `index.js:78` | `DASHBOARD_URL` | CORS/redirects | `http://localhost:3000` |
| `index.js:79` | `PUBLIC_URL` | Public facing URL | `http://localhost:3000` |
| `index.js:16` | `STEPPER_URL` | Report generation | `http://localhost:3005` |
| `index.js:17` | `STEPPER_FORCE_HTTP` | Force HTTP mode | `false` |
| `index.js:37` | `API_BASE_URL` | Callback URL | `http://localhost:3001` |
| `index.js:1651` | `WEBHOOK_SECRET` | Webhook security | *Required* |

### Production Example:
```dotenv
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
DASHBOARD_URL=https://commitdiary.com
PUBLIC_URL=https://api.commitdiary.com
STEPPER_URL=https://stepper.commitdiary.com
STEPPER_FORCE_HTTP=false
API_BASE_URL=https://api.commitdiary.com
WEBHOOK_SECRET=abc123def456...
```

---

## 📦 Package: stepper

**File:** `packages/stepper/.env.example`

```dotenv
NODE_ENV=development
PORT=3001  # Default, usually changed to 3005
LOG_LEVEL=debug

# Redis configuration
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=stepper:

# Cache configuration
CACHE_TTL_SECONDS=604800
CACHE_STALE_THRESHOLD=86400
CACHE_STALE_WHILE_REVALIDATE=true

# Queue configuration
QUEUE_NAME=report-generation
QUEUE_CONCURRENCY=5

# Webhook configuration
WEBHOOK_ENABLED=true
WEBHOOK_SECRET=your-webhook-secret-here
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY_MS=5000

# AI Provider API Keys (use at least one)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
GOOGLE_AI_API_KEY=

# OpenRouter specific (optional)
OPENROUTER_REFERER=https://commitdiary.com
OPENROUTER_TITLE=CommitDiary Stepper
```

### Production Example:
```dotenv
NODE_ENV=production
PORT=3005
LOG_LEVEL=info
REDIS_URL=redis://production-redis.example.com:6379
WEBHOOK_ENABLED=true
WEBHOOK_SECRET=abc123def456...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🎯 Hardcoded URLs Analysis

### ✅ Legitimate Hardcoded URLs (External Resources)

These are **intentional** and correct:

1. **Google Fonts** (`svgBadgeGenerator.js:160`)
   ```javascript
   @import url('https://fonts.googleapis.com/css2?family=Poppins...');
   ```
   ✅ External CDN, no environment variable needed

2. **VS Code Marketplace** (`QuickMenu.js:52,165`)
   ```javascript
   href="https://marketplace.visualstudio.com/items?..."
   ```
   ✅ Official Microsoft URL, no environment variable needed

3. **Badge Placeholder** (`documentation/page.js:244`)
   ```javascript
   src="https://img.shields.io/badge/..."
   ```
   ✅ Shield.io badge service, no environment variable needed

### ✅ Proper Fallback Patterns

All development URLs have proper fallbacks:

```javascript
// ✅ CORRECT - Environment variable with sensible default
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ✅ CORRECT - Port from env or default
const port = process.env.PORT || 3001

// ✅ CORRECT - Conditional on environment
const apiUrl = isDevelopment 
  ? `http://localhost:${PORT}` 
  : process.env.API_BASE_URL
```

---

## 🚀 Deployment Checklist

### Local Development
- [x] All `.env.example` files exist
- [x] Default values work out of the box
- [x] No secrets required for basic functionality

### Staging/Production
- [ ] Copy `.env.example` to `.env`
- [ ] Replace all placeholder values
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS URLs where applicable
- [ ] Generate secure `WEBHOOK_SECRET` (32+ chars)
- [ ] Verify CORS origins match deployment URLs

---

## 📝 Environment Variable Priority

Each package resolves URLs in this order:

1. **Environment Variable** (highest priority)
   ```javascript
   process.env.NEXT_PUBLIC_API_URL
   ```

2. **Fallback/Default** (development only)
   ```javascript
   || 'http://localhost:3001'
   ```

3. **No Hardcoded URLs in Production** ✅

---

## 🔐 Security Best Practices

### ✅ What's Public (Client-Side)
These are **safe** to expose in browser:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design)
- `NEXT_PUBLIC_API_URL`

### ❌ What's Secret (Server-Side Only)
**NEVER** expose these in client code:
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBHOOK_SECRET`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `REDIS_URL`

### Current Status: ✅ SECURE
- All sensitive keys are server-side only
- Client keys properly prefixed with `NEXT_PUBLIC_`
- No secrets hardcoded in repository

---

## 🛠️ How to Override URLs

### Development
```bash
# Override API URL for testing
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001 pnpm dev

# Test with production API
NEXT_PUBLIC_API_URL=https://api.commitdiary.com pnpm dev
```

### Production (Vercel Example)
```bash
# Set in Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_API_URL production
```

### Production (Docker Example)
```yaml
# docker-compose.yml
environment:
  - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
  - NEXT_PUBLIC_API_URL=https://api.commitdiary.com
```

---

## ✅ Conclusion

Your project is **properly configured** with:

1. ✅ **No hardcoded secrets** or API URLs
2. ✅ **Environment variables** for all endpoints
3. ✅ **Sensible defaults** for local development
4. ✅ **Clear documentation** in `.env.example` files
5. ✅ **Separation** of public vs private keys
6. ✅ **CSP headers** dynamically configured from env

### Summary Table

| Package | Config File | Required Vars | Optional Vars |
|---------|------------|---------------|---------------|
| **web-dashboard** | `.env.example` | 3 | 1 |
| **api** | `.env.example` | 4 | 6 |
| **stepper** | `.env.example` | 2 | 15+ |

**All URLs are environment-based! 🎉**
