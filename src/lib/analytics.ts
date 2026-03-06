import "server-only";
import { PostHog } from "posthog-node";

// ---------------------------------------------------------------------------
// Server-side PostHog client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1, // serverless: flush after every event
      flushInterval: 0,
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Track a server-side event
// ---------------------------------------------------------------------------

export function track(
  userId: string | null,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getClient();
  if (!client) return;

  if (userId) {
    client.capture({ distinctId: userId, event, properties });
  } else {
    // Anonymous event (e.g. newsletter signup, pre-auth signup)
    client.capture({
      distinctId: `anon-${Date.now()}`,
      event,
      properties: { ...properties, $process_person_profile: false },
    });
  }
}

// ---------------------------------------------------------------------------
// Track an LLM call with timing and token usage
// ---------------------------------------------------------------------------

export interface LLMTrackingResult<T> {
  result: T;
  duration_ms: number;
}

export async function trackLLM<T>(
  userId: string | null,
  operation: string,
  model: string,
  fn: () => Promise<T>,
  extra?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  let success = true;
  let error_message: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (err) {
    success = false;
    error_message = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const duration_ms = Date.now() - start;
    track(userId, "llm_call", {
      operation,
      model,
      duration_ms,
      success,
      ...(error_message ? { error_message } : {}),
      ...extra,
    });
  }
}
