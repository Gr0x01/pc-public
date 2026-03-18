/**
 * Fetch full page content for thin RSS items before enrichment.
 *
 * RSS descriptions are 100-500 chars — not enough for accurate LLM classification.
 * This fetches the full source page and extracts article text so enrichment has
 * real content to work with.
 *
 * No host allowlist — every URL in regulatory_items.source_url came from our own
 * fetchers, so they're already trusted. Adding an allowlist just creates a silent
 * failure when we onboard a new source.
 */

import { extractMainContent } from "../fetchers/utils";

const FETCH_TIMEOUT_MS = 10_000;

export interface ContentFetchResult {
  content: string | null;
  error?: string;
}

const RETRY_DELAY_MS = 1_000;
const MAX_ATTEMPTS = 2;

/**
 * Fetch and extract article text from a source URL.
 * Returns null content on any failure (caller proceeds with thin content).
 * Retries once on transient failures (network errors, 5xx).
 */
export async function fetchSourceContent(
  sourceUrl: string
): Promise<ContentFetchResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(sourceUrl, {
        headers: { Accept: "text/html" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      // Non-retryable client errors
      if (!res.ok && res.status < 500) {
        return { content: null, error: `HTTP ${res.status}` };
      }

      // Retryable server errors
      if (!res.ok) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        return { content: null, error: `HTTP ${res.status}` };
      }

      const html = await res.text();
      const text = extractMainContent(html);

      if (text.length < 50) {
        return { content: null, error: "Extracted content too short" };
      }

      return { content: text };
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      return { content: null, error: msg };
    }
  }

  return { content: null, error: "Max attempts exceeded" };
}
