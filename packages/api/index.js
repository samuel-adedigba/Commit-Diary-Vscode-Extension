import express from "express";
import { createClient } from "@supabase/supabase-js";
import zlib from "zlib";
import crypto from "crypto";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Report service imports
import * as reportService from "./services/reportService.js";
import { initCronPoller } from "./cron/cronPoller.js";

// Stepper Integration
let stepper = null;
const STEPPER_URL = process.env.STEPPER_URL || "http://localhost:3005";

async function initStepper() {
  try {
    const stepperModule = await import("@commitdiary/stepper");
    stepper = stepperModule;
    console.log("✅ Stepper package loaded via workspace");
  } catch (e) {
    console.log(
      `ℹ️  Stepper package not found, using HTTP mode at ${STEPPER_URL}`,
    );
    // HTTP Fallback implementation
    stepper = {
      enqueueReport: async (input) => {
        try {
          const response = await fetch(`${STEPPER_URL}/v1/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const data = await response.json();
          return { status: response.status, ...data };
        } catch (err) {
          console.error("[Stepper HTTP] Enqueue failed:", err.message);
          throw err;
        }
      },
      getJob: async (jobId) => {
        try {
          const response = await fetch(`${STEPPER_URL}/v1/reports/${jobId}`);
          return await response.json();
        } catch (err) {
          console.error("[Stepper HTTP] Get job failed:", err.message);
          throw err;
        }
      },
    };
  }
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
        console.error("[Body Parser] Gzip decompression error:", error);
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
  console.warn(
    "⚠️  Supabase credentials not configured. Authentication will fail.",
  );
}

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

if (!supabaseAdmin) {
  console.error(
    "❌ Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

console.log("✅ Supabase client initialized");

// Authentication Middleware
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let userId = null;

    // Try JWT first
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

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
    console.error("Auth error:", error);
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
        "PUT - Toggle auto-report generation for repo",
      "/v1/repos/reports": "GET - List repos with report settings",
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
    console.error("Get profile error:", error);
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
      console.error("Repo upsert error:", repoError);
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
      console.error("Commit upsert error:", commitError);
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

    console.log(
      `✅ [Supabase] Synced ${syncedCount} commits for user ${userId}`,
    );
    if (rejected.length > 0) {
      console.log(
        `⚠️  [Supabase] Rejected ${rejected.length} commits (duplicates)`,
      );
    }

    // Auto-trigger report generation if enabled for this repo
    let reportJobs = [];
    if (
      enableReports &&
      stepper &&
      insertedCommits &&
      insertedCommits.length > 0
    ) {
      console.log(
        `📝 Auto-generating reports for ${insertedCommits.length} commits...`,
      );

      // Create a map of SHA -> commit data for quick lookup
      const commitDataMap = new Map();
      commits.forEach((c) => {
        commitDataMap.set(c.sha, c);
      });

      // Trigger report generation for each new commit (in parallel, but limit concurrency)
      const reportPromises = insertedCommits
        .slice(0, 10)
        .map(async (insertedCommit) => {
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
              await reportService.createReportJob(supabaseAdmin, {
                commitId: insertedCommit.id,
                userId,
                jobId: result.jobId,
              });
              return { sha: insertedCommit.sha, jobId: result.jobId };
            } else if (result.status === 200) {
              // Cached - save directly (rare during ingest, but handle it)
              return { sha: insertedCommit.sha, cached: true };
            }
          } catch (err) {
            console.error(
              `Error triggering report for ${insertedCommit.sha}:`,
              err,
            );
            return null;
          }
        });

      const results = await Promise.allSettled(reportPromises);
      reportJobs = results
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value);

      if (reportJobs.length > 0) {
        console.log(`📋 Created ${reportJobs.length} report jobs`);
      }
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
    console.error("Ingest error:", error);
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
      console.error("Count error:", countError);
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
      console.error("Commits error:", commitsError);
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
    console.error("Metrics error:", error);
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
    let baseQuery = supabaseAdmin
      .from("commits")
      .select("*, repos(name)", { count: "exact" })
      .eq("user_id", userId);

    if (from) {
      baseQuery = baseQuery.gte("date", from);
    }

    if (to) {
      baseQuery = baseQuery.lte("date", to);
    }

    // console.log(`[API] Fetching commits for user ${userId} with params:`, {
    //   from,
    //   to,
    //   category,
    //   search,
    // });

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
      console.error("Get commits error:", error);
      return res.status(500).json({ error: "Failed to fetch commits" });
    }

    // Flatten repo_name for the frontend
    const commits = (rawCommits || []).map((commit) => ({
      ...commit,
      repo_name: commit.repos?.name || "Unknown Repository",
    }));

    res.json({
      commits,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get commits error:", error);
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
      console.error("List API keys error:", error);
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
    console.error("List API keys error:", error);
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
      console.error("Insert API key error:", error);
      return res.status(500).json({ error: "Failed to generate API key" });
    }

    // console.log(`✅ Generated API key for user ${userId}: ${name}`);

    // Return the key ONCE (user must save it)
    res.json({
      id: keyId,
      key: apiKey,
      name,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generate API key error:", error);
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

    //  console.log(`✅ Revoked API key ${keyId} for user ${userId}`);

    res.json({ message: "API key revoked" });
  } catch (error) {
    console.error("Revoke API key error:", error);
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
      console.error("Telemetry error:", error);
      return res.status(500).json({ error: "Failed to record telemetry" });
    }

    res.json({ message: "Telemetry recorded" });
  } catch (error) {
    console.error("Telemetry error:", error);
    res.status(500).json({ error: "Failed to record telemetry" });
  }
});

// ==================== COMMIT REPORTS ENDPOINTS ====================

// Toggle auto-report generation for a repository
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

      const result = await reportService.toggleReports(
        supabaseAdmin,
        parseInt(repoId),
        userId,
        enabled,
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      console.log(
        `📝 Reports ${enabled ? "enabled" : "disabled"} for repo ${repoId}`,
      );
      res.json({
        message: `Reports ${enabled ? "enabled" : "disabled"}`,
        enabled,
      });
    } catch (error) {
      console.error("Toggle reports error:", error);
      res.status(500).json({ error: "Failed to toggle reports" });
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
    console.error("Get report error:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// Trigger report generation for a commit
app.post("/v1/commits/:commitId/report", authMiddleware, async (req, res) => {
  try {
    const { commitId } = req.params;
    const userId = req.userId;

    console.log(
      `[DEBUG] Trigger report for commit ${commitId} by user ${userId}`,
    );

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

    if (result.status === 200) {
      // Immediate cache hit - save directly
      await reportService.completeJob(
        supabaseAdmin,
        `direct_${Date.now()}`,
        result.data,
        { provider: "cached" },
      );

      return res.json({
        status: "completed",
        message: "Report generated from cache",
        report: result.data,
      });
    }

    // Job enqueued - create tracking entry
    const jobResult = await reportService.createReportJob(supabaseAdmin, {
      commitId: parseInt(commitId),
      userId,
      jobId: result.jobId,
    });

    if (!jobResult.success) {
      return res.status(500).json({ error: jobResult.error });
    }

    console.log(
      `📋 Report job created: ${result.jobId} for commit ${commitId}`,
    );

    res.status(202).json({
      status: "processing",
      message: "Report generation started",
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Trigger report error:", error);
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
    console.error("Get job status error:", error);
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
      console.error("Get repos error:", error);
      return res.status(500).json({ error: "Failed to fetch repos" });
    }

    res.json({ repos: repos || [] });
  } catch (error) {
    console.error("Get repos reports error:", error);
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
    console.error("Build snapshot error:", error);
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
      console.error("Create share error:", shareError);
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

    // console.log(`✅ Created share ${share.id} for user ${userId}`);

    res.json({
      id: share.id,
      token: share.token,
      url: publicUrl,
      expires_at: expiresAt,
      total_commits: snapshot.total_commits,
      total_repos: snapshot.total_repos,
    });
  } catch (error) {
    console.error("Create share error:", error);
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
      console.error("List shares error:", error);
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
    console.error("List shares error:", error);
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

    //    console.log(`✅ Revoked share ${shareId} for user ${userId}`);

    res.json({ message: "Share revoked" });
  } catch (error) {
    console.error("Revoke share error:", error);
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
        console.log(
          "🔄 [Live Mode] Refreshing snapshot for share:",
          shareData.id,
        );
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
          console.error("Failed to refresh live snapshot:", err);
          // Fall through to serve stale data rather than failing
        }
      }
    }

    if (snapshotError || !snapshot) {
      // Fallback: build on the fly
      console.log("Building snapshot on the fly for share:", shareData.id);
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
    console.error("Get share error:", error);
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
    console.error("Export share error:", error);
    res.status(500).json({ error: "Failed to export share" });
  }
});

app.listen(port, () => {
  console.log(`🚀 CommitDiary API running on port ${port}`);
  console.log(`📊 Database: Supabase Postgres`);
  // console.log(`🔗 Supabase URL: ${supabaseUrl}`);

  // Initialize cron poller for async report jobs
  if (supabaseAdmin) {
    initCronPoller({
      supabase: supabaseAdmin,
      stepper: stepper,
      intervalMs: 2 * 60 * 1000, // 2 minutes
    });
  }
});

export default app;
