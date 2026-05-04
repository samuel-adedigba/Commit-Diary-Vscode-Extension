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
import { createStepperClient } from "./clients/stepperClient.js";
import { createReportingRouter } from "./routes/reporting.routes.js";
import { createJobsRouter } from "./routes/jobs.routes.js";
import { createReportActionsRouter } from "./routes/report-actions.routes.js";
import { createReportWebhooksRouter } from "./routes/report-webhooks.routes.js";

// Stepper Integration
let stepper = null;
const FORCE_HTTP_MODE = process.env.STEPPER_FORCE_HTTP === "true";
const API_BASE_URL =
  process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

async function initStepper() {
  stepper = await createStepperClient({
    forceHttp: FORCE_HTTP_MODE,
    callbackUrl: `${API_BASE_URL}/v1/webhooks/report-completed`,
    callbacks: [],
  });
  console.log(`✅ Stepper client initialized in ${stepper.mode} mode`);
}

const stepperInitPromise = initStepper().catch((error) => {
  console.error("❌ Failed to initialize Stepper client:", error?.message || error);
  stepper = null;
});

const app = express();
const port = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== "production";

app.set("etag", false);

function isTransientSupabaseError(err) {
  if (!err) return false;
  const message = err?.message || "";
  const code = err?.code || err?.cause?.code;
  return (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    message.includes("fetch failed") ||
    message.includes("timeout")
  );
}

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

app.use("/v1", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

if (isDev) {
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(
        `[api] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  });
}

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

        if (error) {
          if (isTransientSupabaseError(error)) {
            return res.status(503).json({
              error:
                "Authentication service temporarily unavailable. Please try again.",
              code: "SERVICE_UNAVAILABLE",
            });
          }
          return res.status(401).json({ error: "Invalid or expired token" });
        }
        if (!user) {
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
        if (isTransientSupabaseError(networkError)) {
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

const ENABLE_DEBUG_ROUTES = process.env.ENABLE_DEBUG_ROUTES === "true";

async function debugRouteMiddleware(req, res, next) {
  if (!ENABLE_DEBUG_ROUTES) {
    return res.status(404).json({ error: "Not found" });
  }

  return authMiddleware(req, res, next);
}

app.use(
  createReportingRouter({
    authMiddleware,
    supabaseAdmin,
    getStepper: () => stepper,
    reportService,
  }),
);

app.use(
  createJobsRouter({
    authMiddleware,
    supabaseAdmin,
    getStepper: () => stepper,
    reportService,
  }),
);

app.use(
  createReportActionsRouter({
    authMiddleware,
    supabaseAdmin,
    getStepper: () => stepper,
    reportService,
  }),
);

app.use(
  createReportWebhooksRouter({
    supabaseAdmin,
    reportService,
  }),
);

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
              repoId,
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
    const commits = (rawCommits || []).map((commit) => {
      const reportRows = Array.isArray(commit.commit_reports)
        ? commit.commit_reports
        : commit.commit_reports
          ? [commit.commit_reports]
          : [];
      const latestReport = reportRows[0] || null;

      return {
        ...commit,
        repo_name: commit.repos?.name || "Unknown Repository",
        has_report: reportRows.length > 0,
        report_generation_type: latestReport?.generation_type || null,
        report_created_at: latestReport?.created_at || null,
        commit_reports: undefined, // Remove raw join data
      };
    });

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
    const { page = 1, limit = 50, repo, refresh } = req.query;

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
      const forceRefresh =
        refresh === "1" || refresh === "true" || refresh === true;
      const needsRefresh = forceRefresh || now - lastUpdate > 15 * 60 * 1000; // 15 minutes or explicit refresh

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

/**
 * Debug endpoint to test webhook functionality
 * This helps diagnose webhook issues without waiting for real report generation
 */
app.post(
  "/v1/debug/test-webhook",
  debugRouteMiddleware,
  express.json(),
  async (req, res) => {
  try {
    console.log('🧪 Debug webhook test called');
    
    const { jobId, status, commitId, repoId, userId } = req.body;
    
    if (!jobId || !status) {
      return res.status(400).json({ 
        error: "Missing required fields: jobId, status" 
      });
    }

    console.log(`🧪 Testing webhook with:`, { jobId, status, commitId, repoId, userId });

    // Simulate the webhook payload structure
    const mockPayload = {
      jobId,
      status,
      result: status === 'completed' ? { title: 'Test Report', summary: 'Test completion' } : undefined,
      error: status === 'failed' ? 'Test error' : undefined,
      timestamp: Date.now()
    };

    // Process it like a real webhook
    if (status === "completed" && mockPayload.result) {
      // Find job info if commitId provided
      let jobInfo = null;
      if (commitId) {
        const { data, error } = await supabaseAdmin
          .from("report_jobs")
          .select("commit_id, user_id, repo_id, backfill_id")
          .eq("commit_id", commitId)
          .eq("user_id", req.userId)
          .single();
        if (error?.message?.includes("repo_id") || error?.message?.includes("backfill_id")) {
          const { data: fallbackData } = await supabaseAdmin
            .from("report_jobs")
            .select("commit_id, user_id")
            .eq("commit_id", commitId)
            .eq("user_id", req.userId)
            .single();
          jobInfo = fallbackData ? { ...fallbackData, repo_id: null, backfill_id: null } : null;
        } else {
          jobInfo = data;
        }
      }

      if (jobInfo) {
        console.log(`🧪 Found job info: commit_id=${jobInfo.commit_id}, user_id=${jobInfo.user_id}`);
        
        // Check for backfill
        const backfill = await reportService.findActiveBackfillForCommit(
          supabaseAdmin,
          {
            userId: jobInfo.user_id,
            commitId: jobInfo.commit_id,
            repoId: jobInfo.repo_id || null,
          },
        );

        if (backfill) {
          const isBackfillCommit = (backfill.commit_details || []).some(
            (d) => d.commitId === jobInfo.commit_id,
          );
          if (isBackfillCommit) {
            console.log(`🧪 Updating backfill commit status for commit ${jobInfo.commit_id}`);
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              jobInfo.commit_id,
              "completed",
              jobId,
            );
            console.log(`🧪 ✅ Backfill commit status updated`);
          }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: "Debug webhook test completed",
      processed: mockPayload
    });

  } catch (error) {
    console.error(`🧪 Debug webhook error:`, error);
    return res.status(500).json({ error: "Debug webhook failed" });
  }
  },
);

// Get pending jobs count for a repository
app.get("/v1/repos/:repoId/jobs/pending", authMiddleware, async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.userId;
    
    // Get all commit IDs for this repository
    const { data: commits } = await supabaseAdmin
      .from("commits")
      .select("id")
      .eq("repo_id", repoId)
      .eq("user_id", userId);
    
    if (!commits || commits.length === 0) {
      return res.json({ pendingCount: 0, failedCount: 0 });
    }
    
    const commitIds = commits.map(c => c.id);
    
    // Get pending and failed jobs for these commits
    const { data: pendingJobs, error: pendingError } = await supabaseAdmin
      .from("report_jobs")
      .select("status")
      .in("commit_id", commitIds)
      .eq("status", "pending");
    
    const { data: failedJobs, error: failedError } = await supabaseAdmin
      .from("report_jobs")
      .select("status")
      .in("commit_id", commitIds)
      .eq("status", "failed");
    
    const pendingCount = (pendingJobs || []).length;
    const failedCount = (failedJobs || []).length;
    
    res.json({ 
      pendingCount, 
      failedCount,
      totalJobs: pendingCount + failedCount
    });
  } catch (error) {
    console.error(`Failed to get pending jobs for repo ${req.params.repoId}:`, error);
    res.status(500).json({ error: "Failed to get pending jobs" });
  }
});

// Debug endpoint to test stepper connection
app.get("/v1/debug/stepper", debugRouteMiddleware, async (req, res) => {
  try {
    if (!stepper) {
      return res.json({ error: "Stepper not initialized" });
    }
    
    const testInput = {
      userId: "test",
      commitSha: "abc123",
      repo: "test-repo",
      message: "test commit",
      files: ["test.js"],
      components: [],
      diffSummary: "test changes"
    };
    
    const result = await stepper.enqueueReport(testInput);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Stepper test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual backfill recovery endpoint
app.post(
  "/v1/debug/recover-backfill/:repoId",
  debugRouteMiddleware,
  async (req, res) => {
  try {
    const { repoId } = req.params;
    const userId = req.userId;
    
    if (!stepper) {
      return res.json({ error: "Stepper not initialized" });
    }
    
    // Get stuck backfill
    const { data: backfill } = await supabaseAdmin
      .from("backfill_jobs")
      .select("*")
      .eq("repo_id", repoId)
      .eq("user_id", userId)
      .eq("status", "processing")
      .single();
    
    if (!backfill) {
      return res.json({ error: "No stuck backfill found" });
    }
    
    console.log(`🔄 Recovering backfill ${backfill.id} for repo ${repoId}`);
    
    // Get commits for this backfill
    const commitIds = backfill.commit_details.map(d => d.commitId);
    const { data: commits } = await supabaseAdmin
      .from("commits")
      .select("*, repos(name)")
      .eq("user_id", userId)
      .in("id", commitIds);
    
    let processed = 0;
    
    // Process each stuck commit
    for (const commit of commits) {
      const commitDetail = backfill.commit_details.find(d => d.commitId === commit.id);
      
      if (commitDetail.status === "pending" && !commitDetail.jobId) {
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

          console.log(`📤 Enqueuing job for commit ${commit.sha}`);
          const result = await stepper.enqueueReport(promptInput);

          if (result.status === 202 && result.jobId) {
            // Job enqueued - update backfill status
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              commit.id,
              "processing",
              result.jobId,
            );
            
            // Create job tracking
            await reportService.createReportJob(supabaseAdmin, {
              commitId: commit.id,
              userId,
              jobId: result.jobId,
              repoId: backfill.repo_id,
              backfillId: backfill.id,
            });
            
            processed++;
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
              backfill.id,
              commit.id,
              "completed",
            );
            
            processed++;
          }
        } catch (err) {
          console.error(`❌ Failed to process commit ${commit.sha}:`, err);
          await reportService.updateBackfillCommitStatus(
            supabaseAdmin,
            backfill.id,
            commit.id,
            "failed",
            null,
            err.message,
          );
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Processed ${processed} commits`,
      processed 
    });
  } catch (error) {
    console.error('Backfill recovery failed:', error);
    res.status(500).json({ error: error.message });
  }
  },
);

// Get system health and job statistics
app.get("/v1/system/health", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get job statistics for this user
    const { data: pendingJobs } = await supabaseAdmin
      .from("report_jobs")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending");
    
    const { data: failedJobs } = await supabaseAdmin
      .from("report_jobs")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "failed");
    
    // Get active backfills
    const { data: activeBackfills } = await supabaseAdmin
      .from("backfill_jobs")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "processing");
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      statistics: {
        pendingJobs: (pendingJobs || []).length,
        failedJobs: (failedJobs || []).length,
        activeBackfills: (activeBackfills || []).length,
      }
    });
  } catch (error) {
    console.error('System health check failed:', error);
    res.status(500).json({ error: "Health check failed" });
  }
});

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
  // Initialize cron poller for async report jobs after stepper setup settles.
  if (supabaseAdmin) {
    stepperInitPromise.finally(() => {
      initCronPoller({
        supabase: supabaseAdmin,
        stepper: stepper,
        intervalMs: 15 * 60 * 1000, // 15 minutes - recovery mode only (webhooks deliver instantly)
      });
    });
  }
});

export default app;
