#!/usr/bin/env node

/**
 * Cross-repo API/Stepper rollout verifier.
 *
 * Required env:
 * - API_BASE_URL (e.g. https://api.staging.commitdiary.com)
 * - AUTH_TOKEN (Supabase/API bearer token)
 * - COMMIT_ID (commit id to trigger report for)
 *
 * Optional env:
 * - POLL_INTERVAL_MS (default: 4000)
 * - POLL_TIMEOUT_MS (default: 180000)
 */

const API_BASE_URL = process.env.API_BASE_URL;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const COMMIT_ID = process.env.COMMIT_ID;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 4000);
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS || 180000);

if (!API_BASE_URL || !AUTH_TOKEN || !COMMIT_ID) {
  console.error(
    "Missing required env. Set API_BASE_URL, AUTH_TOKEN, COMMIT_ID.",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  "Content-Type": "application/json",
};

async function call(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch (_err) {
    body = null;
  }
  return { ok: response.ok, status: response.status, body, url };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("== CommitDiary Cross-Repo Rollout Verification ==");
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Commit ID: ${COMMIT_ID}`);

  // 1) API health check
  const health = await call("/v1/system/health");
  if (!health.ok) {
    console.error(
      `FAIL: /v1/system/health returned ${health.status} (${health.url})`,
    );
    process.exit(1);
  }
  console.log("PASS: API health endpoint reachable.");

  // 2) Trigger report generation
  const trigger = await call(`/v1/commits/${COMMIT_ID}/report`, {
    method: "POST",
  });
  if (!trigger.ok) {
    console.error(
      `FAIL: trigger report returned ${trigger.status}. Body:`,
      trigger.body,
    );
    process.exit(1);
  }
  console.log("PASS: Report trigger accepted.");

  // 3) Poll report status to terminal
  const start = Date.now();
  let latest = null;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const statusResult = await call(`/v1/commits/${COMMIT_ID}/report`);
    if (!statusResult.ok) {
      console.error(
        `FAIL: status check returned ${statusResult.status}. Body:`,
        statusResult.body,
      );
      process.exit(1);
    }

    latest = statusResult.body;
    const status = latest?.status;
    process.stdout.write(`status=${status}\n`);

    if (status === "completed") {
      console.log("PASS: Report reached completed terminal state.");
      break;
    }
    if (status === "failed") {
      console.error("FAIL: Report reached failed terminal state.", latest);
      process.exit(1);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  if (!latest || latest?.status !== "completed") {
    console.error(
      `FAIL: Timed out waiting for completed report (timeout ${POLL_TIMEOUT_MS}ms).`,
    );
    process.exit(1);
  }

  // 4) Optional webhook logs check (best effort)
  const webhookLogs = await call("/v1/settings/webhooks/logs?limit=5");
  if (webhookLogs.ok) {
    console.log("INFO: Webhook logs endpoint reachable.");
  } else {
    console.log(
      `INFO: Webhook logs endpoint not accessible (${webhookLogs.status}); skipping.`,
    );
  }

  console.log("== RESULT: PASS ==");
}

main().catch((err) => {
  console.error("Unexpected verification error:", err);
  process.exit(1);
});

