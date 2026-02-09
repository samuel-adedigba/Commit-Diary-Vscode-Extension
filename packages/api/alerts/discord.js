/**
 * Discord Webhook Notification System
 *
 * Two independent webhook systems:
 * 1. SYSTEM_DISCORD_WEBHOOK_URL - API errors, exceptions, crashes
 * 2. User webhooks - Report notifications (configured per-user in database)
 *
 * This allows API to have its own error monitoring without depending on
 * Stepper's error webhook system, keeping both completely standalone.
 */

import crypto from "crypto";

// System-level Discord webhook for API error monitoring
// Independent from Stepper's error webhook (different URL, different purpose)
const SYSTEM_DISCORD_WEBHOOK_URL = process.env.DISCORD_ERROR_WEBHOOK_URL;

// Log initialization status
if (SYSTEM_DISCORD_WEBHOOK_URL) {
} else {
}

// Queue for managing Discord webhook deliveries
const webhookQueue = [];
let isProcessingQueue = false;

// Rate limiting: Discord allows 30 requests per minute per webhook
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;
const webhookRateLimits = new Map(); // Map<webhookUrl, { count, resetAt }>

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * @param {object} payload - The payload to sign
 * @param {string} secret - The webhook secret
 * @returns {string} - Hex-encoded signature
 */
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
}

/**
 * Check and update rate limit for a webhook URL
 * @param {string} webhookUrl
 * @returns {boolean} - true if request is allowed, false if rate limited
 */
function checkRateLimit(webhookUrl) {
  const now = Date.now();
  const limit = webhookRateLimits.get(webhookUrl);

  if (!limit || now >= limit.resetAt) {
    // Reset window
    webhookRateLimits.set(webhookUrl, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Rate limited
  }

  limit.count++;
  return true;
}

/**
 * Send Discord webhook with retry logic and exponential backoff
 * @param {object} options
 * @param {string} options.webhookUrl - Discord webhook URL
 * @param {object} options.payload - Discord message payload
 * @param {string} [options.secret] - Optional secret for HMAC signature
 * @param {number} [options.attempt=1] - Current attempt number
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @returns {Promise<object>} - { success, statusCode, error, attempt }
 */
async function sendDiscordWebhook({
  webhookUrl,
  payload,
  secret,
  attempt = 1,
  maxRetries = 3,
}) {
  // Check rate limit
  if (!checkRateLimit(webhookUrl)) {
    const limit = webhookRateLimits.get(webhookUrl);
    const waitTime = limit.resetAt - Date.now();

    // Queue for later
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          sendDiscordWebhook({
            webhookUrl,
            payload,
            secret,
            attempt,
            maxRetries,
          }),
        );
      }, waitTime);
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "CommitDiary/1.0",
  };

  // Add HMAC signature if secret provided
  if (secret) {
    const timestamp = Date.now();
    const signature = generateSignature({ ...payload, timestamp }, secret);
    headers["X-Webhook-Signature"] = signature;
    headers["X-Webhook-Timestamp"] = timestamp.toString();
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const statusCode = response.status;

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read response");

      // Retry on 5xx errors, 408 (timeout), or 429 (rate limit)
      const shouldRetry =
        statusCode >= 500 || statusCode === 408 || statusCode === 429;

      if (shouldRetry && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return sendDiscordWebhook({
          webhookUrl,
          payload,
          secret,
          attempt: attempt + 1,
          maxRetries,
        });
      }

      return {
        success: false,
        statusCode,
        error: `HTTP ${statusCode}: ${errorBody}`,
        attempt,
      };
    }

    return {
      success: true,
      statusCode,
      attempt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Retry on network errors
    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return sendDiscordWebhook({
        webhookUrl,
        payload,
        secret,
        attempt: attempt + 1,
        maxRetries,
      });
    }

    return {
      success: false,
      statusCode: 0,
      error: errorMessage,
      attempt,
    };
  }
}

/**
 * Queue a Discord webhook for delivery
 * @param {object} item - Queue item with webhookUrl, payload, secret, userId, etc.
 */
function queueWebhook(item) {
  webhookQueue.push(item);
  processQueue(); // Start processing if not already running
}

/**
 * Process queued webhooks with concurrency control
 */
async function processQueue() {
  if (isProcessingQueue || webhookQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (webhookQueue.length > 0) {
    const item = webhookQueue.shift();

    try {
      const result = await sendDiscordWebhook({
        webhookUrl: item.webhookUrl,
        payload: item.payload,
        secret: item.secret,
        maxRetries: item.maxRetries || 3,
      });

      // Call callback if provided
      if (item.onComplete) {
        item.onComplete(result);
      }
    } catch (error) {
    }

    // Small delay between requests to avoid overwhelming Discord
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  isProcessingQueue = false;
}

/**
 * Format commit report as Discord embed
 * @param {object} report - Commit report from database
 * @param {object} commit - Commit data
 * @returns {object} - Discord embed payload
 */
function formatReportEmbed(report, commit) {
  const fields = [];

  // Add commit info
  if (commit.sha) {
    fields.push({
      name: "📝 Commit",
      value: `\`${commit.sha.substring(0, 7)}\``,
      inline: true,
    });
  }

  if (commit.author_name) {
    fields.push({
      name: "👤 Author",
      value: commit.author_name,
      inline: true,
    });
  }

  if (commit.date) {
    fields.push({
      name: "📅 Date",
      value: new Date(commit.date).toLocaleString(),
      inline: true,
    });
  }

  // Add category and tags
  if (commit.category) {
    fields.push({
      name: "🏷️ Category",
      value: commit.category,
      inline: true,
    });
  }

  if (report.tags) {
    fields.push({
      name: "🔖 Tags",
      value: report.tags,
      inline: true,
    });
  }

  // Add generation metadata
  if (report.provider_used) {
    fields.push({
      name: "🤖 Generated By",
      value: report.provider_used,
      inline: true,
    });
  }

  // Add changes summary (truncate if too long)
  if (
    report.changes &&
    Array.isArray(report.changes) &&
    report.changes.length > 0
  ) {
    const changesList = report.changes
      .slice(0, 5)
      .map((c) => `• ${c}`)
      .join("\n");
    const truncated =
      report.changes.length > 5
        ? `\n... and ${report.changes.length - 5} more`
        : "";
    fields.push({
      name: "📋 Key Changes",
      value: (changesList + truncated).substring(0, 1024), // Discord limit
      inline: false,
    });
  }

  // Add rationale (truncated)
  if (report.rationale) {
    fields.push({
      name: "💡 Rationale",
      value: report.rationale.substring(0, 1024),
      inline: false,
    });
  }

  // Add impact section (truncated)
  if (report.impact_and_tests) {
    fields.push({
      name: "🎯 Impact & Tests",
      value: report.impact_and_tests.substring(0, 1024),
      inline: false,
    });
  }

  // Add next steps
  if (
    report.next_steps &&
    Array.isArray(report.next_steps) &&
    report.next_steps.length > 0
  ) {
    const stepsList = report.next_steps
      .slice(0, 3)
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    const truncated =
      report.next_steps.length > 3
        ? `\n... and ${report.next_steps.length - 3} more`
        : "";
    fields.push({
      name: "⏭️ Next Steps",
      value: (stepsList + truncated).substring(0, 1024),
      inline: false,
    });
  }

  return {
    embeds: [
      {
        title: `✅ ${report.title}`,
        description: report.summary.substring(0, 2048), // Discord limit: 2048 chars
        color: 0x00ff00, // Green
        fields,
        footer: {
          text: `CommitDiary • Generated in ${report.generation_time_ms}ms`,
        },
        timestamp: new Date(report.created_at).toISOString(),
      },
    ],
  };
}

/**
 * Send system error alert to centralized Discord webhook
 * @param {object} alert
 * @param {string} alert.title - Alert title
 * @param {string} alert.message - Alert message
 * @param {'info'|'warning'|'critical'} alert.severity - Severity level
 * @param {object} [alert.metadata] - Additional metadata
 */
async function sendSystemAlert(alert) {
  if (!SYSTEM_DISCORD_WEBHOOK_URL) {
    return;
  }

  const emoji =
    alert.severity === "critical"
      ? "🚨"
      : alert.severity === "warning"
        ? "⚠️"
        : "ℹ️";

  const embed = {
    embeds: [
      {
        title: `${emoji} ${alert.title}`,
        description: alert.message,
        color:
          alert.severity === "critical"
            ? 0xff0000
            : alert.severity === "warning"
              ? 0xffa500
              : 0x00ff00,
        fields: alert.metadata
          ? Object.entries(alert.metadata).map(([key, value]) => ({
              name: key,
              value: String(value).substring(0, 1024),
              inline: true,
            }))
          : [],
        footer: {
          text: "CommitDiary API",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await sendDiscordWebhook({
      webhookUrl: SYSTEM_DISCORD_WEBHOOK_URL,
      payload: embed,
      maxRetries: 2, // Fewer retries for system alerts
    });
  } catch (error) {
  }
}

/**
 * Send database error alert
 */
async function alertDatabaseError(operation, error) {
  await sendSystemAlert({
    title: "Database Error",
    message: `Database operation **${operation}** failed\n\n**Error:**\n\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``,
    severity: "critical",
    metadata: {
      operation,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send API error alert
 */
async function alertApiError(endpoint, statusCode, error) {
  await sendSystemAlert({
    title: "API Error",
    message: `Endpoint **${endpoint}** returned ${statusCode}\n\n**Error:**\n\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``,
    severity: statusCode >= 500 ? "critical" : "warning",
    metadata: {
      endpoint,
      statusCode,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send user webhook event
 * @param {object} options
 * @param {string} options.userId - User ID
 * @param {string} options.webhookUrl - User's Discord webhook URL
 * @param {string} options.webhookSecret - User's webhook secret
 * @param {string} options.eventType - Event type (e.g., 'report_completed')
 * @param {object} options.data - Event data (report, commit, etc.)
 * @param {object} [options.supabase] - Supabase client for logging
 */
async function sendUserWebhookEvent({
  userId,
  webhookUrl,
  webhookSecret,
  eventType,
  data,
  supabase,
}) {
  let payload;

  // Format payload based on event type
  if (eventType === "report_completed" && data.report && data.commit) {
    payload = formatReportEmbed(data.report, data.commit);
  } else if (
    eventType === "backfill_completed" ||
    eventType === "backfill_started"
  ) {
    payload = {
      embeds: [
        {
          title:
            eventType === "backfill_started"
              ? "🔄 Backfill Started"
              : "✅ Backfill Completed",
          description:
            data.message ||
            `Backfill for repository **${data.repoName || "Unknown"}**`,
          color: eventType === "backfill_started" ? 0x0099ff : 0x00ff00,
          fields: [
            {
              name: "📊 Total Commits",
              value: String(data.totalCommits || 0),
              inline: true,
            },
            {
              name: "✅ Completed",
              value: String(data.completedCount || 0),
              inline: true,
            },
            {
              name: "⏳ Pending",
              value: String(data.pendingCount || 0),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else if (eventType === "report_failed") {
    payload = {
      embeds: [
        {
          title: "❌ Report Generation Failed",
          description: data.message || "Failed to generate commit report",
          color: 0xff0000,
          fields: data.commit
            ? [
                {
                  name: "📝 Commit",
                  value: `\`${data.commit.sha?.substring(0, 7) || "Unknown"}\``,
                  inline: true,
                },
                {
                  name: "❗ Error",
                  value: (data.error || "Unknown error").substring(0, 1024),
                  inline: false,
                },
              ]
            : [],
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else {
    // Generic event format
    payload = {
      embeds: [
        {
          title: `📢 ${eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
          description: data.message || "Event notification",
          color: 0x0099ff,
          fields: Object.entries(data)
            .filter(([key]) => key !== "message")
            .slice(0, 10)
            .map(([key, value]) => ({
              name: key,
              value: String(value).substring(0, 1024),
              inline: true,
            })),
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  // Queue webhook for delivery
  queueWebhook({
    webhookUrl,
    payload,
    secret: webhookSecret,
    userId,
    eventType,
    maxRetries: 3,
    onComplete: async (result) => {
      // Log delivery to database if supabase client provided
      if (supabase) {
        try {
          // Get webhook settings ID
          const { data: settings } = await supabase
            .from("user_webhook_settings")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (settings) {
            // Log delivery
            await supabase.from("user_webhook_delivery_log").insert({
              user_id: userId,
              webhook_settings_id: settings.id,
              event_type: eventType,
              payload,
              status_code: result.statusCode,
              success: result.success,
              error_message: result.error || null,
              attempt: result.attempt,
            });

            // Update webhook settings stats
            await supabase
              .from("user_webhook_settings")
              .update({
                last_delivery_at: new Date().toISOString(),
                ...(result.success
                  ? {
                      last_success_at: new Date().toISOString(),
                      failure_count: 0,
                    }
                  : {
                      last_failure_at: new Date().toISOString(),
                      failure_count: supabase.raw("failure_count + 1"),
                    }),
                total_deliveries: supabase.raw("total_deliveries + 1"),
              })
              .eq("user_id", userId);
          }
        } catch (error) {
        }
      }
    },
  });
}

export {
  sendDiscordWebhook,
  sendSystemAlert,
  alertDatabaseError,
  alertApiError,
  sendUserWebhookEvent,
  formatReportEmbed,
  generateSignature,
};
