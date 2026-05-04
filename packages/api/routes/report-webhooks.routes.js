import express from "express";
import crypto from "crypto";
import * as discordAlerts from "../alerts/discord.js";

function validateWebhookSignature(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7);
    if (bearerToken === WEBHOOK_SECRET) {
      return true;
    }
  }

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  if (!signature || !timestamp) {
    return false;
  }

  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  const payloadString = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadString)
    .digest("hex");

  return signature === expectedSignature;
}

async function sendDiscordNotification(supabaseAdmin, userId, result, options) {
  try {
    const { data: webhookSettings } = await supabaseAdmin
      .from("user_webhook_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true)
      .single();

    if (!webhookSettings) {
      return { success: false, message: "No webhook configured" };
    }

    const events = webhookSettings.events || [];
    const webhookUrl = webhookSettings.discord_webhook_url;
    const webhookSecret = webhookSettings.webhook_secret;

    if (!webhookUrl) {
      return { success: false, message: "No webhook URL" };
    }

    if (options.success && result) {
      if (!events.includes("report_completed")) {
        return { success: false, message: "Event not subscribed" };
      }

      const payload = {
        embeds: [
          {
            title: `✅ ${result.title || "Commit Report Generated"}`,
            description: (
              result.summary || "Report generated successfully"
            ).substring(0, 2048),
            color: 0x00ff00,
            fields: [
              {
                name: "📝 Commit",
                value: `\`${options.commitSha?.substring(0, 7) || "Unknown"}\``,
                inline: true,
              },
              {
                name: "📦 Repository",
                value: options.repo || "Unknown",
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
            ],
            footer: {
              text: `CommitDiary • Job ID: ${options.jobId}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const discordResult = await discordAlerts.sendDiscordWebhook({
        webhookUrl,
        payload,
        secret: webhookSecret,
        maxRetries: 3,
      });

      return {
        success: discordResult.success,
        statusCode: discordResult.statusCode,
      };
    }

    if (!options.success && options.error) {
      if (!events.includes("report_failed")) {
        return { success: false, message: "Event not subscribed" };
      }

      const payload = {
        embeds: [
          {
            title: "❌ Report Generation Failed",
            description: `Failed to generate commit report for \`${options.commitSha?.substring(0, 7) || "Unknown"}\``,
            color: 0xff0000,
            fields: [
              {
                name: "📦 Repository",
                value: options.repo || "Unknown",
                inline: true,
              },
              {
                name: "❗ Error",
                value: (options.error || "Unknown error").substring(0, 1024),
                inline: false,
              },
              {
                name: "🆔 Job ID",
                value: options.jobId || "Unknown",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const discordResult = await discordAlerts.sendDiscordWebhook({
        webhookUrl,
        payload,
        secret: webhookSecret,
        maxRetries: 2,
      });

      return {
        success: discordResult.success,
        statusCode: discordResult.statusCode,
      };
    }

    return { success: false, message: "Invalid notification options" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function createReportWebhooksRouter({ supabaseAdmin, reportService }) {
  const router = express.Router();

  router.post("/v1/stepper/callback", express.json(), async (req, res) => {
    try {
      const { success, result, error, metadata } = req.body;
      const { userId, commitSha, repo, jobId, provider, generationTimeMs, timestamp } =
        metadata || {};

      if (!userId) {
        return res
          .status(200)
          .json({ success: true, message: "No userId, skipped" });
      }

      let webhookSettings = null;
      try {
        const { data: settings } = await supabaseAdmin
          .from("user_webhook_settings")
          .select("*")
          .eq("user_id", userId)
          .eq("enabled", true)
          .single();
        webhookSettings = settings;
      } catch (dbError) {}

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

      if (success && result) {
        if (!events.includes("report_completed")) {
          return res
            .status(200)
            .json({ success: true, message: "Event not subscribed" });
        }

        const payload = {
          embeds: [
            {
              title: `✅ ${result.title || "Commit Report Generated"}`,
              description: (
                result.summary || "Report generated successfully"
              ).substring(0, 2048),
              color: 0x00ff00,
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

        const discordResult = await discordAlerts.sendDiscordWebhook({
          webhookUrl,
          payload,
          secret: webhookSecret,
          maxRetries: 3,
        });

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
              color: 0xff0000,
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
      return res.status(200).json({ success: false, error: error.message });
    }
  });

  router.post("/v1/webhooks/report-completed", express.json(), async (req, res) => {
    const maxRetries = 3;
    let attempt = 0;

    const processWebhook = async () => {
      try {
        if (!validateWebhookSignature(req)) {
          throw new Error("Invalid webhook signature");
        }

        const { jobId, status, result, error } = req.body;

        if (!jobId) {
          throw new Error("Missing jobId");
        }

        if (status === "completed" && result) {
          const { data: jobInfo, error: jobError } =
            await reportService.getReportJobByJobId(supabaseAdmin, jobId);

          if (jobError) {
            throw new Error(`Job lookup failed: ${jobError.message}`);
          }

          const saveResult = await reportService.completeJob(
            supabaseAdmin,
            jobId,
            result,
            {
              generationType: "auto",
            },
          );

          if (!saveResult.success) {
            throw new Error(`Database save failed: ${saveResult.error}`);
          }

          const backfill = await reportService.findActiveBackfillForCommit(
            supabaseAdmin,
            {
              userId: jobInfo.user_id,
              commitId: jobInfo.commit_id,
              repoId: jobInfo.repo_id || null,
            },
          );

          if (backfill) {
            await reportService.updateBackfillCommitStatus(
              supabaseAdmin,
              backfill.id,
              jobInfo.commit_id,
              "completed",
              jobId,
            );
          }

          return { success: true, message: "Report saved" };
        }

        if (status === "failed" && error) {
          const { data: jobInfo } = await reportService.getReportJobByJobId(
            supabaseAdmin,
            jobId,
          );

          if (jobInfo) {
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

          await reportService.markJobFailed(supabaseAdmin, jobId, error);
          return {
            success: true,
            message: "Failure recorded",
          };
        }

        throw new Error(`Invalid webhook payload status: ${status}`);
      } catch (error) {
        attempt++;
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return processWebhook();
        }
        throw error;
      }
    };

    try {
      const result = await processWebhook();
      res.status(200).json(result);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Webhook processing failed", message: error.message });
    }
  });

  return router;
}
