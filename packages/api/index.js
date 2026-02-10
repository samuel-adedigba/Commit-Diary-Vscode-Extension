import express from "express";
import { createClient } from "@supabase/supabase-js";
import zlib from "zlib";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Import Discord alerts for system error monitoring
import * as discordAlerts from "./alerts/discord.js";

// Report service imports
import * as reportService from "./services/reportService.js";
import { initCronPoller } from "./cron/cronPoller.js";

// Stepper Integration
let stepper = null;
const STEPPER_URL = process.env.STEPPER_URL || "http://localhost:3005";
const STEPPER_API_KEY = process.env.STEPPER_API_KEY || "";
const STEPPER_API_KEY_HEADER =
  process.env.STEPPER_API_KEY_HEADER ||
  process.env.API_KEY_HEADER ||
  "x-api-key";
const FORCE_HTTP_MODE = process.env.STEPPER_FORCE_HTTP === "true";

async function initStepper() {
  if (FORCE_HTTP_MODE) {
  } else {
    try {
      const stepperModule = await import("ai-inference-stepper");
      stepper = stepperModule;
      return;
    } catch (e) {}
  }

  // HTTP Fallback implementation
  const API_BASE_URL =
    process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

  stepper = {
    enqueueReport: async (input) => {
      try {
        const requestBody = {
          ...input,
          // Legacy callback for DB operations (job status updates)
          callbackUrl: `${API_BASE_URL}/v1/webhooks/report-completed`,
          // New callbacks array for immediate Discord delivery (bypasses DB failures)
          callbacks: [
            {
              url: `${API_BASE_URL}/v1/stepper/callback`,
              headers: {
                "X-CommitDiary-Internal": "true",
              },
              continueOnFailure: true, // Don't fail the job if callback fails
              retry: { maxAttempts: 2, delayMs: 1000 },
            },
          ],
        };

        const headers = { "Content-Type": "application/json" };
        if (STEPPER_API_KEY) {
          headers[STEPPER_API_KEY_HEADER] = STEPPER_API_KEY;
        }

        const response = await fetch(`${STEPPER_URL}/v1/reports`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        return { status: response.status, ...data };
      } catch (err) {
        throw err;
      }
    },
    getJob: async (jobId) => {
      try {
        const headers = {};
        if (STEPPER_API_KEY) {
          headers[STEPPER_API_KEY_HEADER] = STEPPER_API_KEY;
        }
        const response = await fetch(`${STEPPER_URL}/v1/reports/${jobId}`, {
          headers,
        });
        return await response.json();
      } catch (err) {
        throw err;
      }
    },
  };
}

initStepper();

const app = express();
const port = process.env.PORT || 3001;

// CORS Configuration - Must be FIRST middleware
const allowedOrigins = [
  process.env.DASHBOARD_URL || "http://localhost:3000",
  process.env.PUBLIC_URL || "http://localhost:3000",
  "https://commitdiary-web.vercel.app",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, X-Client-Version, Content-Encoding",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Body parsing middleware - AFTER CORS
// Custom middleware to handle both JSON and gzipped JSON
app.use((req, res, next) => {
  // Check if request is gzipped
  const isGzipped =
    req.headers["content-type"] === "application/gzip" ||
    req.headers["content-encoding"] === "gzip";

  if (isGzipped) {
    // Collect raw buffer for gzipped data
    let rawData = [];
    req.on("data", (chunk) => rawData.push(chunk));
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(rawData);
        const decompressed = zlib.gunzipSync(buffer);
        req.body = JSON.parse(decompressed.toString("utf-8"));
        next();
      } catch (error) {
        return res.status(400).json({ error: "Invalid gzipped payload" });
      }
    });
  } else {
    // Use standard JSON parser for non-gzipped requests
    express.json({ limit: "10mb" })(req, res, next);
  }
});

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: (url, options = {}) => {
            // Add timeout and retry logic for network requests
            const timeout = 30000; // 30 seconds (increased from default 10s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
          },
        },
      })
    : null;

if (!supabaseAdmin) {
  // Alert critical configuration error
  discordAlerts
    .sendSystemAlert({
      title: "API Startup Error",
      message: "Supabase client failed to initialize. Missing credentials.",
      severity: "critical",
      metadata: {
        supabaseUrl: supabaseUrl ? "configured" : "missing",
        serviceKey: supabaseServiceKey ? "configured" : "missing",
      },
    })
    .catch(() => undefined);
  process.exit(1);
}

// Authentication Middleware
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let userId = null;

    // Try JWT first
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const {
          data: { user },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        userId = user.id;

        // Ensure user exists in our database
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("id", userId)
          .single();

        if (!existingUser) {
          await supabaseAdmin
            .from("users")
            .insert({ id: userId, email: user.email });
        }
      } catch (networkError) {
        // Handle network/timeout errors separately
        if (
          networkError.code === "UND_ERR_CONNECT_TIMEOUT" ||
          networkError.message?.includes("fetch failed") ||
          networkError.message?.includes("timeout")
        ) {
          return res.status(503).json({
            error:
              "Authentication service temporarily unavailable. Please try again.",
            code: "SERVICE_UNAVAILABLE",
          });
        }
        throw networkError; // Re-throw if not a network error
      }
    }
    // Try API Key
    else if (apiKeyHeader) {
      const keyHash = crypto
        .createHash("sha256")
        .update(apiKeyHeader)
        .digest("hex");

      const { data: apiKey, error } = await supabaseAdmin
        .from("api_keys")
        .select("user_id")
        .eq("key_hash", keyHash)
        .is("revoked_at", null)
        .single();

      if (error || !apiKey) {
        return res.status(401).json({ error: "Invalid or revoked API key" });
      }

      userId = apiKey.user_id;

      // Update last used timestamp
      await supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash);
    } else {
      return res.status(401).json({ error: "No authentication provided" });
    }

    // Attach user ID to request
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
}

// Rate limiting helper for token bucket (per share)
const rateLimitBuckets = new Map(); // shareId -> { tokens, lastRefill }
const RATE_LIMIT_BUCKET_SIZE = 100; // 100 requests
const RATE_LIMIT_REFILL_RATE = 10; // 10 tokens per minute
const RATE_LIMIT_REFILL_INTERVAL = 60 * 1000; // 1 minute

function checkRateLimit(shareId, ipAddress) {
  const now = Date.now();
  const key = `${shareId}:${ipAddress}`;

  if (!rateLimitBuckets.has(key)) {
    rateLimitBuckets.set(key, {
      tokens: RATE_LIMIT_BUCKET_SIZE,
      lastRefill: now,
    });
  }

  const bucket = rateLimitBuckets.get(key);

  // Refill tokens based on time elapsed
  const timeSinceRefill = now - bucket.lastRefill;
  const tokensToAdd =
    Math.floor(timeSinceRefill / RATE_LIMIT_REFILL_INTERVAL) *
    RATE_LIMIT_REFILL_RATE;

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      RATE_LIMIT_BUCKET_SIZE,
      bucket.tokens + tokensToAdd,
    );
    bucket.lastRefill = now;
  }

  // Check if tokens available
  if (bucket.tokens < 1) {
    return false; // Rate limit exceeded
  }

  // Consume one token
  bucket.tokens -= 1;
  return true;
}

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "CommitDiary API",
    version: "1.0.0",
    endpoints: {
      "/v1/ingest/commits": "POST - Ingest commit data",
      "/v1/repos/:repoId/metrics": "GET - Get repository metrics",
      "/v1/repos/:repoId/reports/toggle":
        "PUT - Toggle auto-report generation for repo (triggers backfill on enable)",
      "/v1/repos/:repoId/reports/backfill":
        "GET - Get backfill progress for repo",
      "/v1/repos/:repoId/reports/backfill/retry":
        "POST - Retry failed backfill commits",
      "/v1/repos/reports":
        "GET - List repos with report settings and backfill status",
      "/v1/users/:userId/commits": "GET - Get user commits",
      "/v1/users/profile": "GET - Get user profile (auth check)",
      "/v1/users/api-keys": "GET - List API keys, POST - Generate API key",
      "/v1/users/api-keys/:keyId": "DELETE - Revoke API key",
      "/v1/commits/:commitId/report":
        "GET - Get report, POST - Trigger generation",
      "/v1/jobs/:jobId": "GET - Get job status",
      "/v1/shares": "GET - List shares, POST - Create share",
      "/v1/shares/:shareId": "DELETE - Revoke share",
      "/v1/shares/:shareId/export": "GET - Export share data",
      "/s/:username/:token": "GET - Public share view",
      "/v1/telemetry": "POST - Submit telemetry data",
    },
  });
});

// Get user profile (used for API key validation)
app.get("/v1/users/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, email, created_at")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Ingest commits endpoint
app.post("/v1/ingest/commits", authMiddleware, async (req, res) => {
  try {
    // req.body is already parsed JSON (middleware handled decompression)
    const { repo, commits, client_metadata } = req.body;

    if (!repo || !commits || !Array.isArray(commits)) {
      return res.status(400).json({ error: "Invalid payload structure" });
    }

    if (commits.length > 500) {
      return res
        .status(400)
        .json({ error: "Too many commits. Maximum 500 per request." });
    }

    const userId = req.userId;

    // Upsert repo
    const { data: repoData, error: repoError } = await supabaseAdmin
      .from("repos")
      .upsert(
        {
          user_id: userId,
          name: repo.name,
          remote: repo.remote,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,remote",
          ignoreDuplicates: false,
        },
      )
      .select("id, enable_reports")
      .single();

    if (repoError) {
      return res.status(500).json({ error: "Failed to upsert repository" });
    }

    const repoId = repoData.id;
    const enableReports = repoData.enable_reports === true;

    // Prepare commits for upsert
    const commitsToInsert = commits.map((commit) => ({
      user_id: userId,
      repo_id: repoId,
      sha: commit.sha,
      author_name: commit.author_name,
      author_email: commit.author_email,
      date: commit.date,
      message: commit.message,
      category: commit.category,
      files: commit.files,
      components: commit.components,
      patterns: commit.context_tags || [],
      diff_summary: commit.diff_summary || null,
    }));

    // Upsert commits (Supabase handles deduplication via UNIQUE constraint on user_id, sha)
    const { data: insertedCommits, error: commitError } = await supabaseAdmin
      .from("commits")
      .upsert(commitsToInsert, {
        onConflict: "user_id,sha",
        ignoreDuplicates: false, // Return all rows even if duplicates
      })
      .select("id, sha");

    if (commitError) {
      return res.status(500).json({ error: "Failed to ingest commits" });
    }

    // Extract synced SHAs from response
    const syncedShas = insertedCommits ? insertedCommits.map((c) => c.sha) : [];
    const syncedCount = syncedShas.length;

    // Find rejected commits (those not in insertedCommits)
    const allSentShas = commits.map((c) => c.sha);
    const rejectedShas = allSentShas.filter((sha) => !syncedShas.includes(sha));
    const rejected = rejectedShas.map((sha) => ({
      sha,
      reason: "Duplicate or constraint violation",
    }));

    // Auto-trigger report generation if enabled for this repo
    let reportJobs = [];
    if (
      enableReports &&
      stepper &&
      insertedCommits &&
      insertedCommits.length > 0
    ) {
      // Sort by date descending (most recent first) to prioritize latest commits
      // Build a map to get original commit data including dates
      const commitDataMap = new Map();
      commits.forEach((c) => {
        commitDataMap.set(c.sha, c);
      });

      const sortedCommits = [...insertedCommits].sort((a, b) => {
        const dateA = commitDataMap.get(a.sha)?.date || "";
        const dateB = commitDataMap.get(b.sha)?.date || "";
        return new Date(dateB) - new Date(dateA);
      });

      // Limit to 5 most recent commits (system-wide constant)
      const commitsToReport = sortedCommits.slice(
        0,
        reportService.AUTO_REPORT_LIMIT,
      );

      // Trigger report generation for each new commit (in parallel, but limit concurrency)
      const reportPromises = commitsToReport.map(async (insertedCommit) => {
        try {
          const originalCommit = commitDataMap.get(insertedCommit.sha);
          if (!originalCommit) return null;

          const promptInput = {
            userId,
            commitSha: insertedCommit.sha,
            repo: repo.name,
            message: originalCommit.message || "",
            files: (originalCommit.files || []).map((f) => f.path || f),
            components: originalCommit.components || [],
            diffSummary: originalCommit.diff_summary || "",
          };

          const result = await stepper.enqueueReport(promptInput);

          if (result.status === 202) {
            // Job enqueued - create tracking entry
            if (!result.jobId) {
              return null;
            }
            await reportService.createReportJob(supabaseAdmin, {
              commitId: insertedCommit.id,
              userId,
              jobId: result.jobId,
            });
            return {
              sha: insertedCommit.sha,
              jobId: result.jobId,
              generationType: "auto",
            };
          } else if (result.status === 200) {
            // Cached - save directly with generation_type='auto'
            if (result.data) {
              await reportService.saveCachedReport(
                supabaseAdmin,
                insertedCommit.id,
                userId,
                result.data,
                { provider: "cached", generationType: "auto" },
              );
            }
            return {
              sha: insertedCommit.sha,
              cached: true,
              generationType: "auto",
            };
          }
        } catch (err) {
          return null;
        }
      });

      const results = await Promise.allSettled(reportPromises);
      reportJobs = results
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value);
    }

    res.json({
      synced: syncedCount,
      synced_shas: syncedShas,
      rejected: rejected,
      last_synced_sha:
        syncedCount > 0 ? syncedShas[syncedShas.length - 1] : null,
      server_timestamp: new Date().toISOString(),
      reports_enabled: enableReports,
      report_jobs: reportJobs.length > 0 ? reportJobs : undefined,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to ingest commits" });
  }
});

// Get repository metrics
app.get("/v1/repos/:repoId/metrics", authMiddleware, async (req, res) => {
  try {
    const { repoId } = req.params;
    const { period = "week", start } = req.query;
    const userId = req.userId;

    // Verify repo belongs to user
    const { data: repo, error: repoError } = await supabaseAdmin
      .from("repos")
      .select("*")
      .eq("id", repoId)
      .eq("user_id", userId)
      .single();

    if (repoError || !repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Calculate date range
    let startDate;
    if (start) {
      startDate = start;
    } else {
      const now = new Date();
      switch (period) {
        case "week":
          startDate = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        case "month":
          startDate = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        case "year":
          startDate = new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        default:
          startDate = new Date(0).toISOString();
      }
    }

    // Get total commits count
    const { count: totalCommits, error: countError } = await supabaseAdmin
      .from("commits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("repo_id", repoId)
      .gte("date", startDate);

    if (countError) {
      return res.status(500).json({ error: "Failed to count commits" });
    }

    // Get commits grouped by category
    const { data: commits, error: commitsError } = await supabaseAdmin
      .from("commits")
      .select("category")
      .eq("user_id", userId)
      .eq("repo_id", repoId)
      .gte("date", startDate);

    if (commitsError) {
      return res.status(500).json({ error: "Failed to fetch commits" });
    }

    // Group by category manually
    const categoryMap = {};
    commits.forEach((c) => {
      const cat = c.category || "uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const byCategory = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      repo: repo.name,
      period,
      start_date: startDate,
      total_commits: totalCommits || 0,
      by_category: byCategory,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// Get user commits
app.get("/v1/users/:userId/commits", authMiddleware, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const userId = req.userId;

    // Users can only access their own data
    if (requestedUserId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { from, to, limit = 50, offset = 0, category, search } = req.query;

    // Build base query for both count and data
    // Include commit_reports to show report status alongside commits
    let baseQuery = supabaseAdmin
      .from("commits")
      .select(
        "*, repos(name), commit_reports(id, generation_type, created_at)",
        { count: "exact" },
      )
      .eq("user_id", userId);

    if (from) {
      baseQuery = baseQuery.gte("date", from);
    }

    if (to) {
      baseQuery = baseQuery.lte("date", to);
    }

    if (category) {
      baseQuery = baseQuery.eq("category", category);
    }

    if (search) {
      // Search in commit message
      baseQuery = baseQuery.ilike("message", `%${search}%`);
    }

    // Execute query with pagination
    const query = baseQuery
      .order("date", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: rawCommits, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: "Failed to fetch commits" });
    }

    // Flatten repo_name and report status for the frontend
    const commits = (rawCommits || []).map((commit) => ({
      ...commit,
      repo_name: commit.repos?.name || "Unknown Repository",
      has_report: !!(commit.commit_reports && commit.commit_reports.length > 0),
      report_generation_type:
        commit.commit_reports?.[0]?.generation_type || null,
      report_created_at: commit.commit_reports?.[0]?.created_at || null,
      commit_reports: undefined, // Remove raw join data
    }));

    res.json({
      commits,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commits" });
  }
});

// List API keys
app.get("/v1/users/api-keys", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: keys, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, created_at, last_used_at, revoked_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to list API keys" });
    }

    // Sort: active keys first, then by created_at desc
    const sortedKeys = (keys || []).sort((a, b) => {
      if (!a.revoked_at && b.revoked_at) return -1;
      if (a.revoked_at && !b.revoked_at) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    res.json({ keys: sortedKeys });
  } catch (error) {
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

// Generate API key
app.post("/v1/users/api-keys", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Generate random API key
    const apiKey = `cd_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyId = `key_${crypto.randomBytes(8).toString("hex")}`;

    const { error } = await supabaseAdmin.from("api_keys").insert({
      id: keyId,
      user_id: userId,
      key_hash: keyHash,
      name,
    });

    if (error) {
      return res.status(500).json({ error: "Failed to generate API key" });
    }

    // Return the key ONCE (user must save it)
    res.json({
      id: keyId,
      key: apiKey,
      name,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

// Revoke API key
app.delete("/v1/users/api-keys/:keyId", authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.userId;

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId)
      .eq("user_id", userId)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ message: "API key revoked" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

// Telemetry endpoint (opt-in)
app.post("/v1/telemetry", authMiddleware, async (req, res) => {
  try {
    const { event_type, metadata } = req.body;
    const userId = req.userId;

    if (!event_type) {
      return res.status(400).json({ error: "Event type is required" });
    }

    const { error } = await supabaseAdmin.from("telemetry").insert({
      user_id: userId,
      event_type,
      metadata: metadata || {},
    });

    if (error) {
      return res.status(500).json({ error: "Failed to record telemetry" });
    }

    res.json({ message: "Telemetry recorded" });
  } catch (error) {
    res.status(500).json({ error: "Failed to record telemetry" });
  }
});

// ==================== WEBHOOK SETTINGS ENDPOINTS ====================

// Get user's webhook settings
app.get("/v1/settings/webhooks", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabaseAdmin
      .from("user_webhook_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      return res
        .status(500)
        .json({ error: "Failed to fetch webhook settings" });
    }

    if (!data) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      enabled: data.enabled,
      discord_webhook_url: data.discord_webhook_url,
      webhook_secret: data.webhook_secret,
      events: data.events,
      stats: {
        last_delivery_at: data.last_delivery_at,
        last_success_at: data.last_success_at,
        last_failure_at: data.last_failure_at,
        failure_count: data.failure_count,
        total_deliveries: data.total_deliveries,
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhook settings" });
  }
});

// Create or update webhook settings
app.put("/v1/settings/webhooks", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { discord_webhook_url, enabled, events } = req.body;

    // Validate Discord webhook URL
    if (!discord_webhook_url) {
      return res.status(400).json({ error: "Discord webhook URL is required" });
    }

    // Validate URL format (Discord webhooks)
    const webhookUrlPattern =
      /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    if (!webhookUrlPattern.test(discord_webhook_url)) {
      return res.status(400).json({
        error:
          "Invalid Discord webhook URL format. Must be a valid Discord webhook URL.",
      });
    }

    // Validate events array
    const validEvents = [
      "report_completed",
      "report_failed",
      "backfill_started",
      "backfill_completed",
      "backfill_failed",
      "sync_completed",
      "repo_enabled",
    ];

    if (events && Array.isArray(events)) {
      const invalidEvents = events.filter((e) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: `Invalid events: ${invalidEvents.join(", ")}`,
          validEvents,
        });
      }
    }

    // Check if settings already exist
    const { data: existing } = await supabaseAdmin
      .from("user_webhook_settings")
      .select("id")
      .eq("user_id", userId)
      .single();

    let data, error;

    if (existing) {
      // Update existing settings
      const updateData = {
        discord_webhook_url,
        enabled: enabled !== undefined ? enabled : true,
        updated_at: new Date().toISOString(),
      };

      if (events && Array.isArray(events)) {
        updateData.events = events;
      }

      const result = await supabaseAdmin
        .from("user_webhook_settings")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Generate a secure random secret for webhook verification
      const webhookSecret = crypto.randomBytes(32).toString("hex");

      // Create new settings
      const result = await supabaseAdmin
        .from("user_webhook_settings")
        .insert({
          user_id: userId,
          discord_webhook_url,
          webhook_secret: webhookSecret,
          enabled: enabled !== undefined ? enabled : true,
          events: events || validEvents,
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to update webhook settings" });
    }

    res.json({
      message: existing
        ? "Webhook settings updated"
        : "Webhook settings created",
      settings: {
        enabled: data.enabled,
        discord_webhook_url: data.discord_webhook_url,
        webhook_secret: data.webhook_secret,
        events: data.events,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update webhook settings" });
  }
});

// Test webhook delivery
app.post("/v1/settings/webhooks/test", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's webhook settings
    const { data: settings, error } = await supabaseAdmin
      .from("user_webhook_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !settings) {
      return res.status(404).json({
        error:
          "Webhook settings not found. Please configure your webhook first.",
      });
    }

    if (!settings.enabled) {
      return res.status(400).json({
        error: "Webhook is disabled. Please enable it first.",
      });
    }

    // Send test message
    const testPayload = {
      embeds: [
        {
          title: "✅ Test Notification",
          description: "Your CommitDiary webhook is working correctly!",
          color: 0x00ff00,
          fields: [
            {
              name: "📊 User ID",
              value: userId,
              inline: true,
            },
            {
              name: "📅 Timestamp",
              value: new Date().toLocaleString(),
              inline: true,
            },
            {
              name: "🔔 Enabled Events",
              value: Array.isArray(settings.events)
                ? settings.events.join(", ")
                : "All events",
              inline: false,
            },
          ],
          footer: {
            text: "CommitDiary Webhook Test",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const result = await discord.sendDiscordWebhook({
      webhookUrl: settings.discord_webhook_url,
      payload: testPayload,
      secret: settings.webhook_secret,
      maxRetries: 1,
    });

    if (result.success) {
      // Log successful test
      await supabaseAdmin.from("user_webhook_delivery_log").insert({
        user_id: userId,
        webhook_settings_id: settings.id,
        event_type: "test",
        payload: testPayload,
        status_code: result.statusCode,
        success: true,
        attempt: result.attempt,
      });

      res.json({
        success: true,
        message: "Test webhook delivered successfully!",
        statusCode: result.statusCode,
      });
    } else {
      // Log failed test
      await supabaseAdmin.from("user_webhook_delivery_log").insert({
        user_id: userId,
        webhook_settings_id: settings.id,
        event_type: "test",
        payload: testPayload,
        status_code: result.statusCode,
        success: false,
        error_message: result.error,
        attempt: result.attempt,
      });

      res.status(500).json({
        success: false,
        message: "Failed to deliver test webhook",
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to test webhook" });
  }
});

// Delete webhook settings
app.delete("/v1/settings/webhooks", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data, error } = await supabaseAdmin
      .from("user_webhook_settings")
      .delete()
      .eq("user_id", userId)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Webhook settings not found" });
    }

    res.json({ message: "Webhook settings deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete webhook settings" });
  }
});

// Get webhook delivery logs (last 100)
app.get("/v1/settings/webhooks/logs", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabaseAdmin
      .from("user_webhook_delivery_log")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch webhook logs" });
    }

    res.json({
      logs: data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhook logs" });
  }
});

// ==================== COMMIT REPORTS ENDPOINTS ====================

// Toggle auto-report generation for a repository
// When enabling: triggers backfill of 5 most recent unreported commits
// Reports are only fully enabled after all 5 backfill reports complete successfully
app.put(
  "/v1/repos/:repoId/reports/toggle",
  authMiddleware,
  async (req, res) => {
    try {
      const { repoId } = req.params;
      const { enabled } = req.body;
      const userId = req.userId;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      const parsedRepoId = parseInt(repoId);

      if (!enabled) {
        // Disabling - straightforward
        const result = await reportService.toggleReports(
          supabaseAdmin,
          parsedRepoId,
          userId,
          false,
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.json({
          message: "Reports disabled",
          enabled: false,
        });
      }

      // Enabling - trigger backfill of 5 most recent unreported commits
      // Check for existing active backfill
      const activeBackfill = await reportService.hasActiveBackfill(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      if (activeBackfill) {
        return res.status(409).json({
          error: "A backfill is already in progress for this repository",
          status: "processing",
        });
      }

      // Get 5 most recent commits without reports
      const unreportedCommits =
        await reportService.getRecentCommitsWithoutReports(
          supabaseAdmin,
          parsedRepoId,
          userId,
          reportService.AUTO_REPORT_LIMIT,
        );

      if (unreportedCommits.length === 0) {
        // All recent commits already have reports - just enable
        const result = await reportService.toggleReports(
          supabaseAdmin,
          parsedRepoId,
          userId,
          true,
        );

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.json({
          message: "Reports enabled (all recent commits already have reports)",
          enabled: true,
          backfill: null,
        });
      }

      // Don't enable reports yet - wait for backfill to complete
      // Create backfill job to track progress
      const backfillResult = await reportService.createBackfillJob(
        supabaseAdmin,
        parsedRepoId,
        userId,
        unreportedCommits,
      );

      if (!backfillResult.success) {
        return res.status(500).json({ error: backfillResult.error });
      }

      // Check if stepper is available
      if (!stepper) {
        return res.status(503).json({
          error: "Report generation service not available",
        });
      }

      // Enqueue report generation for each commit

      for (const commit of unreportedCommits) {
        try {
          const promptInput = {
            userId,
            commitSha: commit.sha,
            repo: commit.repos?.name || "unknown",
            message: commit.message || "",
            files: (commit.files || []).map((f) => f.path || f),
            components: commit.components || [],
            diffSummary: commit.diff_summary || "",
          };

          const result = await stepper.enqueueReport(promptInput);

          if (result.status === 202 && result.jobId) {
            // Job enqueued - create tracking entry
            await reportService.createReportJob(supabaseAdmin, {
              commitId: commit.id,
              userId,
              jobId: result.jobId,
            });

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfillResult.backfillId,
              commit.id,
              "processing",
              result.jobId,
            );
          } else if (result.status === 200 && result.cached) {
            // Cached hit - save directly
            await reportService.saveCachedReport(
              supabaseAdmin,
              commit.id,
              userId,
              result.data,
              { provider: "cached", generationType: "backfill" },
            );

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfillResult.backfillId,
              commit.id,
              "completed",
            );
          }
        } catch (err) {
          await reportService.updateBackfillCommitStatus(
            supabaseAdmin,
            backfillResult.backfillId,
            commit.id,
            "failed",
            null,
            err.message,
          );
        }
      }

      // Get updated backfill status
      const backfillStatus = await reportService.getBackfillStatus(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      res.status(202).json({
        message: "Backfill started. Reports will be enabled once all complete.",
        enabled: false, // Not enabled yet - waiting for backfill
        backfill: {
          id: backfillResult.backfillId,
          status: backfillStatus?.status || "processing",
          totalCommits: unreportedCommits.length,
          completedCommits: backfillStatus?.completed_commits || 0,
          failedCommits: backfillStatus?.failed_commits || 0,
          commitDetails: backfillStatus?.commit_details || [],
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle reports" });
    }
  },
);

// Get backfill status for a repository
app.get(
  "/v1/repos/:repoId/reports/backfill",
  authMiddleware,
  async (req, res) => {
    try {
      const { repoId } = req.params;
      const userId = req.userId;

      const backfill = await reportService.getBackfillStatus(
        supabaseAdmin,
        parseInt(repoId),
        userId,
      );

      if (!backfill) {
        return res.json({ backfill: null });
      }

      res.json({
        backfill: {
          id: backfill.id,
          status: backfill.status,
          totalCommits: backfill.total_commits,
          completedCommits: backfill.completed_commits,
          failedCommits: backfill.failed_commits,
          commitDetails: backfill.commit_details,
          errorMessage: backfill.error_message,
          createdAt: backfill.created_at,
          updatedAt: backfill.updated_at,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backfill status" });
    }
  },
);

// Retry failed backfill commits
app.post(
  "/v1/repos/:repoId/reports/backfill/retry",
  authMiddleware,
  async (req, res) => {
    try {
      const { repoId } = req.params;
      const userId = req.userId;
      const parsedRepoId = parseInt(repoId);

      // Reset failed commits in backfill
      const resetResult = await reportService.resetBackfillForRetry(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      if (!resetResult.success) {
        return res.status(400).json({ error: resetResult.error });
      }

      const backfill = resetResult.backfill;
      const pendingCommits = backfill.commit_details.filter(
        (d) => d.status === "pending",
      );

      if (!stepper) {
        return res.status(503).json({
          error: "Report generation service not available",
        });
      }

      // Re-enqueue the failed (now pending) commits
      for (const detail of pendingCommits) {
        try {
          const commit = await reportService.getCommitForReport(
            supabaseAdmin,
            detail.commitId,
            userId,
          );

          if (!commit) {
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "failed",
              null,
              "Commit not found",
            );
            continue;
          }

          const promptInput = {
            userId,
            commitSha: commit.sha,
            repo: commit.repos?.name || "unknown",
            message: commit.message || "",
            files: (commit.files || []).map((f) => f.path || f),
            components: commit.components || [],
            diffSummary: commit.diff_summary || "",
          };

          const result = await stepper.enqueueReport(promptInput);

          if (result.status === 202 && result.jobId) {
            await reportService.createReportJob(supabaseAdmin, {
              commitId: detail.commitId,
              userId,
              jobId: result.jobId,
            });

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "processing",
              result.jobId,
            );
          } else if (result.status === 200 && result.cached) {
            await reportService.saveCachedReport(
              supabaseAdmin,
              detail.commitId,
              userId,
              result.data,
              { provider: "cached", generationType: "backfill" },
            );

            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              detail.commitId,
              "completed",
            );
          }
        } catch (err) {
          await reportService.updateBackfillCommitStatus(
            supabaseAdmin,
            backfill.id,
            detail.commitId,
            "failed",
            null,
            err.message,
          );
        }
      }

      const updatedStatus = await reportService.getBackfillStatus(
        supabaseAdmin,
        parsedRepoId,
        userId,
      );

      res.json({
        message: `Retrying ${pendingCommits.length} failed reports`,
        backfill: {
          id: backfill.id,
          status: updatedStatus?.status || "processing",
          totalCommits: updatedStatus?.total_commits || backfill.total_commits,
          completedCommits: updatedStatus?.completed_commits || 0,
          failedCommits: updatedStatus?.failed_commits || 0,
          commitDetails: updatedStatus?.commit_details || [],
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retry backfill" });
    }
  },
);

// Get report for a specific commit
app.get("/v1/commits/:commitId/report", authMiddleware, async (req, res) => {
  try {
    const { commitId } = req.params;
    const userId = req.userId;

    // First check if report exists
    const report = await reportService.getReport(
      supabaseAdmin,
      parseInt(commitId),
      userId,
    );

    if (report) {
      return res.json({
        status: "completed",
        report,
      });
    }

    // Check if there's a pending job
    const job = await reportService.getJobStatus(
      supabaseAdmin,
      parseInt(commitId),
      userId,
    );

    if (job) {
      return res.json({
        status: job.status,
        jobId: job.job_id,
        attempts: job.attempts,
        createdAt: job.created_at,
      });
    }

    // No report and no job
    res.json({ status: "not_found" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// Trigger report generation for a commit
app.post("/v1/commits/:commitId/report", authMiddleware, async (req, res) => {
  try {
    const { commitId } = req.params;
    const userId = req.userId;

    // Check if report already exists
    const existingReport = await reportService.getReport(
      supabaseAdmin,
      parseInt(commitId),
      userId,
    );

    if (existingReport) {
      return res.json({
        status: "completed",
        message: "Report already exists",
        report: existingReport,
      });
    }

    // Check if there's already a pending job
    const existingJob = await reportService.getJobStatus(
      supabaseAdmin,
      parseInt(commitId),
      userId,
    );

    if (existingJob && existingJob.status === "pending") {
      return res.status(202).json({
        status: "processing",
        message: "Report generation already in progress",
        jobId: existingJob.job_id,
      });
    }

    // Get commit data for report generation
    const commit = await reportService.getCommitForReport(
      supabaseAdmin,
      parseInt(commitId),
      userId,
    );

    if (!commit) {
      return res.status(404).json({ error: "Commit not found" });
    }

    // Check if stepper is available
    if (!stepper) {
      return res.status(503).json({
        error: "Report generation service not available",
      });
    }

    // Trigger report generation via Stepper
    const promptInput = {
      userId,
      commitSha: commit.sha,
      repo: commit.repos?.name || "unknown",
      message: commit.message || "",
      files: (commit.files || []).map((f) => f.path || f),
      components: commit.components || [],
      diffSummary: commit.diff_summary || "",
    };

    const result = await stepper.enqueueReport(promptInput);

    if (result.status === 200 && result.cached) {
      // Immediate cache hit - save directly without job tracking
      await reportService.saveCachedReport(
        supabaseAdmin,
        parseInt(commitId),
        userId,
        result.data,
        { provider: "cached", generationType: "manual" },
      );

      return res.json({
        status: "completed",
        message: "Report generated from cache",
        report: result.data,
      });
    }

    // Job enqueued - create tracking entry
    if (!result.jobId) {
      return res.status(500).json({
        error: "Stepper did not return a job ID",
        debug: result,
      });
    }

    const jobResult = await reportService.createReportJob(supabaseAdmin, {
      commitId: parseInt(commitId),
      userId,
      jobId: result.jobId,
    });

    if (!jobResult.success) {
      return res.status(500).json({ error: jobResult.error });
    }

    res.status(202).json({
      status: "processing",
      message: "Report generation started",
      jobId: result.jobId,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger report generation" });
  }
});

// Get job status by ID
app.get("/v1/jobs/:jobId", authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job from database
    const { data: job, error } = await supabaseAdmin
      .from("report_jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (error || !job) {
      // Job might be completed - check if report exists
      return res.json({
        status: "not_found",
        message:
          "Job not found. It may have completed - check the commit report.",
      });
    }

    // Optionally check stepper for real-time status
    let stepperStatus = null;
    if (stepper) {
      try {
        stepperStatus = await stepper.getJob(jobId);
      } catch (e) {
        // Stepper unavailable, use DB status
      }
    }

    res.json({
      status: job.status,
      jobId: job.job_id,
      commitId: job.commit_id,
      attempts: job.attempts,
      createdAt: job.created_at,
      lastPolledAt: job.last_polled_at,
      nextPollAt: job.next_poll_at,
      errorMessage: job.error_message,
      stepperState: stepperStatus?.state || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// Get all repos with their report settings
app.get("/v1/repos/reports", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: repos, error } = await supabaseAdmin
      .from("repos")
      .select("id, name, remote, enable_reports, updated_at")
      .eq("user_id", userId)
      .order("name");

    if (error) {
      return res.status(500).json({ error: "Failed to fetch repos" });
    }

    // Fetch backfill status for all repos
    const { data: backfills } = await supabaseAdmin
      .from("backfill_jobs")
      .select(
        "repo_id, status, total_commits, completed_commits, failed_commits, commit_details, created_at, updated_at",
      )
      .eq("user_id", userId);

    const backfillMap = new Map();
    (backfills || []).forEach((b) => {
      backfillMap.set(b.repo_id, {
        status: b.status,
        totalCommits: b.total_commits,
        completedCommits: b.completed_commits,
        failedCommits: b.failed_commits,
        commitDetails: b.commit_details,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      });
    });

    const reposWithBackfill = (repos || []).map((repo) => ({
      ...repo,
      backfill: backfillMap.get(repo.id) || null,
    }));

    res.json({ repos: reposWithBackfill });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch repos" });
  }
});

// ==================== SHARES ENDPOINTS ====================

// Helper function to build snapshot from commits
async function buildSnapshot(userId, scope, limit = 500) {
  try {
    const { repos = [], from, to } = scope || {};

    // Build query for repos
    let reposQuery = supabaseAdmin
      .from("repos")
      .select("id, name, remote")
      .eq("user_id", userId);

    if (repos && repos.length > 0) {
      reposQuery = reposQuery.in("name", repos);
    }

    const { data: repoData, error: repoError } = await reposQuery;

    if (repoError) throw repoError;
    if (!repoData || repoData.length === 0) {
      return {
        repos: [],
        total_commits: 0,
        total_repos: 0,
        start: from,
        end: to,
      };
    }

    const repoIds = repoData.map((r) => r.id);
    const repoMap = new Map(repoData.map((r) => [r.id, r]));

    // Build query for commits
    let commitsQuery = supabaseAdmin
      .from("commits")
      .select("*")
      .eq("user_id", userId)
      .in("repo_id", repoIds)
      .order("date", { ascending: false })
      .limit(limit);

    if (from) {
      commitsQuery = commitsQuery.gte("date", from);
    }

    if (to) {
      commitsQuery = commitsQuery.lte("date", to);
    }

    const { data: commits, error: commitsError } = await commitsQuery;

    if (commitsError) throw commitsError;

    // Group commits by repo
    const repoCommitsMap = new Map();
    commits.forEach((commit) => {
      const repoId = commit.repo_id;
      if (!repoCommitsMap.has(repoId)) {
        repoCommitsMap.set(repoId, []);
      }
      repoCommitsMap.get(repoId).push({
        sha: commit.sha,
        message: commit.message,
        date: commit.date,
        category: commit.category,
        author_name: commit.author_name,
        files: commit.files || [],
      });
    });

    // Build final structure
    const reposWithCommits = Array.from(repoCommitsMap.entries()).map(
      ([repoId, commits]) => {
        const repo = repoMap.get(repoId);
        return {
          repo_name: repo.name,
          repo_remote: repo.remote,
          commit_count: commits.length,
          commits: commits,
        };
      },
    );

    return {
      repos: reposWithCommits,
      total_commits: commits.length,
      total_repos: reposWithCommits.length,
      start: from,
      end: to,
    };
  } catch (error) {
    throw error;
  }
}

// Create share
app.post("/v1/shares", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, repos, from, to, expires_in_days, live } =
      req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Generate unique token
    const token = crypto.randomBytes(6).toString("hex"); // 12 chars

    // Calculate expiry
    const expiresAt = expires_in_days
      ? new Date(
          Date.now() + expires_in_days * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

    const scope = { repos: repos || [], from, to, live: !!live };

    // Create share record
    const { data: share, error: shareError } = await supabaseAdmin
      .from("shares")
      .insert({
        user_id: userId,
        title,
        description,
        scope,
        token,
        expires_at: expiresAt,
      })
      .select("id, token")
      .single();

    if (shareError) {
      return res.status(500).json({ error: "Failed to create share" });
    }

    // Build snapshot
    const snapshot = await buildSnapshot(userId, scope);

    // Save snapshot
    await supabaseAdmin.from("share_snapshots").insert({
      share_id: share.id,
      payload: snapshot,
      total_commits: snapshot.total_commits,
      total_repos: snapshot.total_repos,
    });

    // Get user's username
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", userId)
      .single();

    const username = user?.username || "user";
    const publicUrl = `${
      // TODO:   process.env.PUBLIC_URL || "http://localhost:3000"
      // REPLACE WITH PRODUCTION URL
      process.env.PUBLIC_URL
    }/s/${username}/${token}`;

    res.json({
      id: share.id,
      token: share.token,
      url: publicUrl,
      expires_at: expiresAt,
      total_commits: snapshot.total_commits,
      total_repos: snapshot.total_repos,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create share" });
  }
});

// List user's shares
app.get("/v1/shares", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const { data: shares, error } = await supabaseAdmin
      .from("shares")
      .select(
        `
        id,
        title,
        description,
        scope,
        token,
        expires_at,
        revoked,
        created_at,
        updated_at,
        share_snapshots (
          total_commits,
          total_repos
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to list shares" });
    }

    // Get username
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", userId)
      .single();

    const username = user?.username || "user";

    // Format response
    const formattedShares = shares.map((share) => ({
      id: share.id,
      title: share.title,
      description: share.description,
      scope: share.scope,
      token: share.token,
      url: `${
        process.env.DASHBOARD_URL || "https://commitdiary-web.vercel.app"
      }/s/${username}/${share.token}`,
      expires_at: share.expires_at,
      revoked: share.revoked,
      created_at: share.created_at,
      total_commits: share.share_snapshots?.[0]?.total_commits || 0,
      total_repos: share.share_snapshots?.[0]?.total_repos || 0,
    }));

    res.json({ shares: formattedShares });
  } catch (error) {
    res.status(500).json({ error: "Failed to list shares" });
  }
});

// Revoke share
app.delete("/v1/shares/:shareId", authMiddleware, async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.userId;

    const { data, error } = await supabaseAdmin
      .from("shares")
      .update({ revoked: true })
      .eq("id", shareId)
      .eq("user_id", userId)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Share not found" });
    }

    res.json({ message: "Share revoked" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke share" });
  }
});

// Public share view (with pagination)
app.get("/s/:username/:token", async (req, res) => {
  try {
    const { username, token } = req.params;
    const { page = 1, limit = 50, repo } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get share by username and token
    const { data: shareData, error: shareError } = await supabaseAdmin
      .from("shares")
      .select(
        `
        id,
        user_id,
        title,
        description,
        scope,
        expires_at,
        revoked,
        users!inner (username)
      `,
      )
      .eq("token", token)
      .eq("users.username", username)
      .single();

    if (shareError || !shareData) {
      return res.status(404).json({ error: "Share not found" });
    }

    // Check if revoked
    if (shareData.revoked) {
      return res.status(410).json({ error: "Share has been revoked" });
    }

    // Check if expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share has expired" });
    }

    // Rate limiting (token bucket per share + IP)
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const allowed = checkRateLimit(shareData.id, ipAddress);

    if (!allowed) {
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Please try again later." });
    }

    // Log access
    await supabaseAdmin.from("share_access_logs").insert({
      share_id: shareData.id,
      ip_address: ipAddress,
      user_agent: req.headers["user-agent"],
    });

    // Get snapshot
    let { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from("share_snapshots")
      .select("payload, total_commits, total_repos, updated_at")
      .eq("share_id", shareData.id)
      .single();

    // Check for "Live Mode" refresh
    if (snapshot && shareData.scope?.live) {
      const lastUpdate = new Date(snapshot.updated_at).getTime();
      const now = Date.now();
      const needsRefresh = now - lastUpdate > 15 * 60 * 1000; // 15 minutes

      if (needsRefresh) {
        try {
          const newSnapshot = await buildSnapshot(
            shareData.user_id,
            shareData.scope,
          );

          // Update DB - effectively treating this as a new cache entry
          await supabaseAdmin
            .from("share_snapshots")
            .update({
              payload: newSnapshot,
              total_commits: newSnapshot.total_commits,
              total_repos: newSnapshot.total_repos,
              updated_at: new Date().toISOString(),
            })
            .eq("share_id", shareData.id);

          // Update local variable
          snapshot = {
            payload: newSnapshot,
            total_commits: newSnapshot.total_commits,
            total_repos: newSnapshot.total_repos,
          };
        } catch (err) {
          // Fall through to serve stale data rather than failing
        }
      }
    }

    if (snapshotError || !snapshot) {
      // Fallback: build on the fly
      const payload = await buildSnapshot(shareData.user_id, shareData.scope);

      res.json({
        title: shareData.title,
        description: shareData.description,
        username,
        scope: shareData.scope,
        ...payload,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      return;
    }

    // Apply pagination to snapshot
    let reposData = snapshot.payload.repos || [];

    // Filter by repo if specified
    if (repo) {
      reposData = reposData.filter((r) => r.repo_name === repo);
    }

    // Paginate commits within each repo
    const paginatedRepos = reposData.map((repoData) => {
      const allCommits = repoData.commits || [];
      const paginatedCommits = allCommits.slice(
        offset,
        offset + parseInt(limit),
      );

      return {
        ...repoData,
        commits: paginatedCommits,
        total_commits: allCommits.length,
        has_more: allCommits.length > offset + parseInt(limit),
      };
    });

    res.json({
      title: shareData.title,
      description: shareData.description,
      username,
      scope: shareData.scope,
      repos: paginatedRepos,
      total_commits: snapshot.total_commits,
      total_repos: snapshot.total_repos,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

// Export share data
app.get("/v1/shares/:shareId/export", authMiddleware, async (req, res) => {
  try {
    const { shareId } = req.params;
    const { format = "md" } = req.query;
    const userId = req.userId;

    // Get share
    const { data: share, error: shareError } = await supabaseAdmin
      .from("shares")
      .select("*, share_snapshots (*)")
      .eq("id", shareId)
      .eq("user_id", userId)
      .single();

    if (shareError || !share) {
      return res.status(404).json({ error: "Share not found" });
    }

    const snapshot = share.share_snapshots?.[0];
    if (!snapshot) {
      return res.status(404).json({ error: "No snapshot available" });
    }

    const payload = snapshot.payload;

    if (format === "md") {
      // Generate Markdown
      let markdown = `# ${share.title}\n\n`;

      if (share.description) {
        markdown += `${share.description}\n\n`;
      }

      markdown += `**Total commits:** ${payload.total_commits}\n`;
      markdown += `**Total repos:** ${payload.total_repos}\n\n`;

      if (payload.start || payload.end) {
        markdown += `**Time range:** ${payload.start || "Beginning"} to ${
          payload.end || "Now"
        }\n\n`;
      }

      markdown += `## Repositories\n\n`;

      payload.repos.forEach((repo) => {
        markdown += `### ${repo.repo_name} — ${repo.commit_count} commits\n\n`;

        repo.commits.forEach((commit) => {
          const date = new Date(commit.date).toISOString().split("T")[0];
          markdown += `- \`${date}\` — **${commit.category}** — ${commit.message}\n`;

          if (commit.files && commit.files.length > 0) {
            markdown += `  - Files: ${commit.files
              .map((f) => f.path || f)
              .join(", ")}\n`;
          }
        });

        markdown += `\n`;
      });

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${share.title.replace(/[^a-z0-9]/gi, "_")}.md"`,
      );
      res.send(markdown);
    } else if (format === "csv") {
      // Generate CSV
      let csv = "Repository,Commit SHA,Date,Category,Message,Author,Files\n";

      payload.repos.forEach((repo) => {
        repo.commits.forEach((commit) => {
          const files = commit.files
            ? commit.files.map((f) => f.path || f).join(";")
            : "";
          const message = commit.message.replace(/"/g, '""'); // Escape quotes
          csv += `"${repo.repo_name}","${commit.sha}","${commit.date}","${commit.category}","${message}","${commit.author_name}","${files}"\n`;
        });
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${share.title.replace(/[^a-z0-9]/gi, "_")}.csv"`,
      );
      res.send(csv);
    } else {
      return res
        .status(400)
        .json({ error: "Invalid format. Use 'md' or 'csv'" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to export share" });
  }
});

// ================== WEBHOOKS ==================

/**
 * Validate webhook signature using both Bearer token and HMAC-SHA256
 */
function validateWebhookSignature(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return false;
  }

  // Check Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const bearerToken = authHeader.substring(7);
  if (bearerToken !== WEBHOOK_SECRET) {
    return false;
  }

  // Check HMAC signature
  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  if (!signature || !timestamp) {
    return false;
  }

  // Verify timestamp is recent (within 5 minutes) to prevent replay attacks
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  // Calculate expected signature
  const payloadString = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadString)
    .digest("hex");

  if (signature !== expectedSignature) {
    return false;
  }

  return true;
}

/**
 * Stepper Callback Endpoint
 * Called by Stepper immediately after report generation (before DB save)
 * This ensures users get Discord notifications even if DB fails
 *
 * Flow:
 * 1. Receive callback from Stepper with raw result
 * 2. Send to user's Discord FIRST (critical path)
 * 3. Return success (DB operations handled by legacy webhook)
 */
app.post("/v1/stepper/callback", express.json(), async (req, res) => {
  try {
    const { success, result, error, metadata } = req.body;
    const {
      userId,
      commitSha,
      repo,
      jobId,
      provider,
      generationTimeMs,
      timestamp,
    } = metadata || {};

    if (!userId) {
      return res
        .status(200)
        .json({ success: true, message: "No userId, skipped" });
    }

    // Fetch user's webhook settings
    let webhookSettings = null;
    try {
      const { data: settings } = await supabaseAdmin
        .from("user_webhook_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("enabled", true)
        .single();
      webhookSettings = settings;
    } catch (dbError) {
      // DB might be down - this is exactly why we get callbacks directly from Stepper
      // We'll try again with cached settings if available, or skip
    }

    if (!webhookSettings) {
      return res
        .status(200)
        .json({ success: true, message: "No webhook configured" });
    }

    const events = webhookSettings.events || [];
    const webhookUrl = webhookSettings.discord_webhook_url;
    const webhookSecret = webhookSettings.webhook_secret;

    if (!webhookUrl) {
      return res.status(200).json({ success: true, message: "No webhook URL" });
    }

    // Handle success case
    if (success && result) {
      if (!events.includes("report_completed")) {
        return res
          .status(200)
          .json({ success: true, message: "Event not subscribed" });
      }

      // Transform result to Discord embed format
      const payload = {
        embeds: [
          {
            title: `✅ ${result.title || "Commit Report Generated"}`,
            description: (
              result.summary || "Report generated successfully"
            ).substring(0, 2048),
            color: 0x00ff00, // Green
            fields: [
              {
                name: "📝 Commit",
                value: `\`${commitSha?.substring(0, 7) || "Unknown"}\``,
                inline: true,
              },
              {
                name: "📦 Repository",
                value: repo || "Unknown",
                inline: true,
              },
              ...(result.category
                ? [
                    {
                      name: "🏷️ Category",
                      value: result.category,
                      inline: true,
                    },
                  ]
                : []),
              ...(result.tags
                ? [
                    {
                      name: "🔖 Tags",
                      value: result.tags,
                      inline: true,
                    },
                  ]
                : []),
              ...(provider
                ? [
                    {
                      name: "🤖 Generated By",
                      value: provider,
                      inline: true,
                    },
                  ]
                : []),
              ...(result.changes &&
              Array.isArray(result.changes) &&
              result.changes.length > 0
                ? [
                    {
                      name: "📋 Key Changes",
                      value: result.changes
                        .slice(0, 5)
                        .map((c) => `• ${c}`)
                        .join("\n")
                        .substring(0, 1024),
                      inline: false,
                    },
                  ]
                : []),
              ...(result.rationale
                ? [
                    {
                      name: "💡 Rationale",
                      value: result.rationale.substring(0, 1024),
                      inline: false,
                    },
                  ]
                : []),
              ...(result.next_steps &&
              Array.isArray(result.next_steps) &&
              result.next_steps.length > 0
                ? [
                    {
                      name: "⏭️ Next Steps",
                      value: result.next_steps
                        .slice(0, 3)
                        .map((s, i) => `${i + 1}. ${s}`)
                        .join("\n")
                        .substring(0, 1024),
                      inline: false,
                    },
                  ]
                : []),
            ],
            footer: {
              text: `CommitDiary • Generated in ${generationTimeMs || 0}ms`,
            },
            timestamp: timestamp || new Date().toISOString(),
          },
        ],
      };

      // Send to Discord IMMEDIATELY - this is the critical path
      const discordResult = await discordAlerts.sendDiscordWebhook({
        webhookUrl,
        payload,
        secret: webhookSecret,
        maxRetries: 3,
      });

      // Log delivery (best effort - don't fail if DB is down)
      try {
        await supabaseAdmin.from("user_webhook_delivery_log").insert({
          user_id: userId,
          webhook_settings_id: webhookSettings.id,
          event_type: "report_completed",
          payload,
          status_code: discordResult.statusCode,
          success: discordResult.success,
          error_message: discordResult.error || null,
          attempt: discordResult.attempt,
        });

        // Update stats
        await supabaseAdmin
          .from("user_webhook_settings")
          .update({
            last_delivery_at: new Date().toISOString(),
            ...(discordResult.success
              ? {
                  last_success_at: new Date().toISOString(),
                  failure_count: 0,
                }
              : {
                  last_failure_at: new Date().toISOString(),
                }),
            total_deliveries: webhookSettings.total_deliveries + 1,
          })
          .eq("id", webhookSettings.id);
      } catch (logError) {}
      return res.status(200).json({
        success: true,
        discordDelivered: discordResult.success,
        message: discordResult.success
          ? "Sent to Discord"
          : "Discord delivery failed",
      });
    }

    // Handle failure case
    if (!success && error) {
      if (!events.includes("report_failed")) {
        return res
          .status(200)
          .json({ success: true, message: "Event not subscribed" });
      }

      const payload = {
        embeds: [
          {
            title: "❌ Report Generation Failed",
            description: `Failed to generate commit report for \`${commitSha?.substring(0, 7) || "Unknown"}\``,
            color: 0xff0000, // Red
            fields: [
              {
                name: "📦 Repository",
                value: repo || "Unknown",
                inline: true,
              },
              {
                name: "❗ Error",
                value: (error || "Unknown error").substring(0, 1024),
                inline: false,
              },
            ],
            timestamp: timestamp || new Date().toISOString(),
          },
        ],
      };

      const discordResult = await discordAlerts.sendDiscordWebhook({
        webhookUrl,
        payload,
        secret: webhookSecret,
        maxRetries: 2,
      });

      return res.status(200).json({
        success: true,
        discordDelivered: discordResult.success,
      });
    }

    return res.status(200).json({ success: true, message: "Processed" });
  } catch (error) {
    // Always return 200 to avoid Stepper retries for our errors
    return res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Webhook endpoint for report completion
 * Called by Stepper when a report job completes
 */
app.post("/v1/webhooks/report-completed", express.json(), async (req, res) => {
  try {
    console.log('Webhook received:', {
      headers: req.headers,
      body: req.body,
      hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
      webhookSecretLength: process.env.WEBHOOK_SECRET?.length
    });

    // Validate webhook signature
    if (!validateWebhookSignature(req)) {
      console.error('Webhook signature validation failed');
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const { jobId, status, result, error, timestamp } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    if (status === "completed" && result) {
      // Report generation succeeded
      // Get the job info to find commit_id for backfill tracking
      const { data: jobInfo, error: jobError } = await supabaseAdmin
        .from("report_jobs")
        .select("commit_id, user_id")
        .eq("job_id", jobId)
        .single();

      await reportService.completeJob(supabaseAdmin, jobId, result, {
        generationType: "auto", // Default for webhook-delivered reports
      });

      // Check if this commit is part of a backfill and update status
      if (jobInfo) {
        const { data: backfill, error: backfillError } = await supabaseAdmin
          .from("backfill_jobs")
          .select("id, commit_details, repo_id")
          .eq("user_id", jobInfo.user_id)
          .eq("status", "processing")
          .single();

        if (backfill) {
          const isBackfillCommit = (backfill.commit_details || []).some(
            (d) => d.commitId === jobInfo.commit_id,
          );
          if (isBackfillCommit) {
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              jobInfo.commit_id,
              "completed",
              jobId,
            );
          }
        } else if (backfillError) {
        }
      } else {
      }
      return res.status(200).json({ success: true, message: "Report saved" });
    } else if (status === "failed" && error) {
      // Report generation failed
      // Get the job info to find commit_id for backfill tracking
      const { data: jobInfo } = await supabaseAdmin
        .from("report_jobs")
        .select("commit_id, user_id")
        .eq("job_id", jobId)
        .single();

      await reportService.markJobFailed(supabaseAdmin, jobId, error);

      // Check if this commit is part of a backfill and update status
      if (jobInfo) {
        const { data: backfill } = await supabaseAdmin
          .from("backfill_jobs")
          .select("id, commit_details")
          .eq("user_id", jobInfo.user_id)
          .in("status", ["processing"])
          .single();

        if (backfill) {
          const isBackfillCommit = (backfill.commit_details || []).some(
            (d) => d.commitId === jobInfo.commit_id,
          );
          if (isBackfillCommit) {
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              jobInfo.commit_id,
              "failed",
              jobId,
              error,
            );
          }
        }
      }
      return res
        .status(200)
        .json({ success: true, message: "Failure recorded" });
    } else {
      return res.status(400).json({ error: "Invalid payload" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ================== SERVER START ==================

// Global error handler for uncaught errors
app.use((err, req, res, next) => {
  // Send Discord alert for 500 errors
  discordAlerts.alertApiError(req.path, 500, err).catch(() => undefined);

  res.status(500).json({
    error: "Internal server error",
    message: err.message || "An unexpected error occurred",
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  discordAlerts
    .sendSystemAlert({
      title: "Unhandled Promise Rejection",
      message: `An unhandled promise rejection occurred in the API`,
      severity: "critical",
      metadata: {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      },
    })
    .catch(() => undefined);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  discordAlerts
    .sendSystemAlert({
      title: "Uncaught Exception",
      message: `A fatal uncaught exception occurred in the API`,
      severity: "critical",
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    })
    .catch(() => undefined);

  // Give time for alert to send before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

app.listen(port, () => {
  // Initialize cron poller for async report jobs
  if (supabaseAdmin) {
    initCronPoller({
      supabase: supabaseAdmin,
      stepper: stepper,
      intervalMs: 15 * 60 * 1000, // 15 minutes - recovery mode only (webhooks deliver instantly)
    });
  }
});

export default app;
