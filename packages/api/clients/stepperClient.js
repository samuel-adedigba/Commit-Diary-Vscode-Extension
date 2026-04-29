const DEFAULT_STEPPER_URL = "http://localhost:3005";

function buildHeaders(apiKey, apiKeyHeader, includeJson = false) {
  const headers = includeJson ? { "Content-Type": "application/json" } : {};
  if (apiKey) {
    headers[apiKeyHeader] = apiKey;
  }
  return headers;
}

function normalizeEnqueueResult(raw, fallbackJobId = null) {
  if (!raw || typeof raw !== "object") {
    return { status: 500, error: "Invalid Stepper response" };
  }

  const status = typeof raw.status === "number" ? raw.status : null;
  const jobId = raw.jobId || raw.id || fallbackJobId || null;

  if (status === 202 || raw.accepted === true) {
    return {
      status: 202,
      jobId,
      ...(raw.message ? { message: raw.message } : {}),
      ...(raw.data ? { data: raw.data } : {}),
    };
  }

  const isCached = raw.cached === true || raw.cacheHit === true;
  const data = raw.data || raw.result || null;
  if (status === 200 && isCached) {
    return {
      status: 200,
      cached: true,
      data,
      ...(raw.message ? { message: raw.message } : {}),
    };
  }

  if (status === 200 && data) {
    return {
      status: 200,
      cached: false,
      data,
      ...(raw.message ? { message: raw.message } : {}),
    };
  }

  return {
    status: status || 500,
    jobId,
    ...(raw.error ? { error: raw.error } : {}),
    ...(raw.message ? { message: raw.message } : {}),
    ...raw,
  };
}

export async function createStepperClient(options = {}) {
  const {
    forceHttp = false,
    stepperUrl = process.env.STEPPER_URL || DEFAULT_STEPPER_URL,
    apiKey = process.env.STEPPER_API_KEY || "",
    apiKeyHeader =
      process.env.STEPPER_API_KEY_HEADER || process.env.API_KEY_HEADER || "x-api-key",
    callbackUrl,
    callbacks = [],
  } = options;

  const withCallbackContract = (input) => ({
    ...input,
    callbackUrl,
    callbacks,
  });

  if (!forceHttp) {
    try {
      const stepperModule = await import("ai-inference-stepper");

      return {
        mode: "package",
        enqueueReport: async (input) => {
          const payload = withCallbackContract(input);
          const raw = await stepperModule.enqueueReport(payload);
          return normalizeEnqueueResult(raw, raw?.jobId || payload?.jobId || null);
        },
        getJob: async (jobId) => {
          return await stepperModule.getJob(jobId);
        },
      };
    } catch (error) {
      // Fall through to HTTP mode.
    }
  }

  return {
    mode: "http",
    enqueueReport: async (input) => {
      const payload = withCallbackContract(input);
      const response = await fetch(`${stepperUrl}/v1/reports`, {
        method: "POST",
        headers: buildHeaders(apiKey, apiKeyHeader, true),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return normalizeEnqueueResult({ status: response.status, ...data });
    },
    getJob: async (jobId) => {
      const response = await fetch(`${stepperUrl}/v1/reports/${jobId}`, {
        headers: buildHeaders(apiKey, apiKeyHeader),
      });
      return await response.json();
    },
  };
}
