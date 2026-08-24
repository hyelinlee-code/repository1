/**
 * Minimal Exa REST client.
 *
 * Deliberately dependency-free — three endpoints, a retry policy, a concurrency
 * gate, and a request log. The log is what the UI's query inspector renders, so
 * a reader can see the exact payload behind every card in the brief.
 *
 * The API key is read from the environment at call time and never leaves the
 * server. Nothing in this module is importable from a client component.
 */

const DEFAULT_BASE_URL = "https://api.exa.ai";
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export class ExaError extends Error {
  constructor(message, { status, endpoint, body } = {}) {
    super(message);
    this.name = "ExaError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

export function hasExaKey() {
  return Boolean(process.env.EXA_API_KEY);
}

/**
 * Tracks spend and payloads across one brief generation. Exa returns a
 * `costDollars` block per call; summing it gives the true cost of a brief,
 * which is the number that matters when this runs twice a day forever.
 */
export class ExaRunLog {
  constructor() {
    this.calls = [];
    this.startedAt = Date.now();
  }

  record(entry) {
    this.calls.push(entry);
    return entry;
  }

  get totalCost() {
    return this.calls.reduce((sum, c) => sum + (c.costDollars ?? 0), 0);
  }

  get totalResults() {
    return this.calls.reduce((sum, c) => sum + (c.resultCount ?? 0), 0);
  }

  summary() {
    const byEndpoint = {};
    for (const call of this.calls) {
      byEndpoint[call.endpoint] = (byEndpoint[call.endpoint] ?? 0) + 1;
    }
    return {
      calls: this.calls.length,
      byEndpoint,
      totalResults: this.totalResults,
      totalCostUsd: Number(this.totalCost.toFixed(4)),
      elapsedMs: Date.now() - this.startedAt,
      failures: this.calls.filter((c) => c.error).length,
      // The inspector only needs the payload and a shallow outcome, never the key.
      requests: this.calls.map((c) => ({
        endpoint: c.endpoint,
        label: c.label,
        payload: c.payload,
        resultCount: c.resultCount ?? 0,
        costDollars: c.costDollars ?? 0,
        durationMs: c.durationMs,
        error: c.error ?? null,
      })),
    };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function totalCostOf(json) {
  const cost = json?.costDollars;
  if (typeof cost === "number") return cost;
  if (cost && typeof cost.total === "number") return cost.total;
  return 0;
}

async function request(endpoint, payload, { label, log, retries = 2, timeoutMs = 30_000 } = {}) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new ExaError("EXA_API_KEY is not set", { endpoint, status: 401 });
  }
  const baseUrl = (process.env.EXA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const startedAt = Date.now();

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
          // Exponential backoff, honouring Retry-After when Exa sends one.
          const retryAfter = Number(response.headers.get("retry-after"));
          const backoff = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2 ** attempt * 600;
          await sleep(backoff);
          lastError = new ExaError(`Exa ${response.status} on ${endpoint}`, {
            status: response.status,
            endpoint,
            body: text.slice(0, 400),
          });
          continue;
        }
        throw new ExaError(
          `Exa request failed: ${response.status} ${response.statusText}`,
          { status: response.status, endpoint, body: text.slice(0, 400) },
        );
      }

      const json = await response.json();
      log?.record({
        endpoint,
        label,
        payload,
        resultCount: json?.results?.length ?? (json?.answer ? 1 : 0),
        costDollars: totalCostOf(json),
        durationMs: Date.now() - startedAt,
      });
      return json;
    } catch (error) {
      lastError = error;
      const isAbort = error?.name === "AbortError";
      if (attempt < retries && (isAbort || !(error instanceof ExaError))) {
        await sleep(2 ** attempt * 600);
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  log?.record({
    endpoint,
    label,
    payload,
    durationMs: Date.now() - startedAt,
    error: lastError?.message ?? "Unknown Exa error",
  });
  throw lastError instanceof ExaError
    ? lastError
    : new ExaError(lastError?.message ?? "Unknown Exa error", { endpoint });
}

/**
 * POST /search — neural or auto search with contents in one round trip.
 * @see https://docs.exa.ai/reference/search
 */
export function exaSearch(payload, options = {}) {
  return request("/search", payload, options);
}

/**
 * POST /contents — retrieve (and optionally livecrawl) pages we already know
 * the URL of. Used for pricing pages, where a cached copy is worse than useless.
 */
export function exaContents(payload, options = {}) {
  return request("/contents", payload, options);
}

/**
 * POST /answer — a cited synthesis. Used once per brief for the editor's note.
 * @see https://docs.exa.ai/reference/answer
 */
export function exaAnswer(payload, options = {}) {
  return request("/answer", payload, options);
}

/**
 * Run tasks with a concurrency ceiling. A full sweep is ~30 searches; firing
 * them all at once is the fastest way to get rate-limited, and Exa's own
 * guidance is to keep parallelism modest.
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        // One failed pass must not sink the brief — record and carry on.
        results[index] = { error, item: items[index] };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner),
  );
  return results;
}
