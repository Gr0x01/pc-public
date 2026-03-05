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

/**
 * Fetch and extract article text from a source URL.
 * Returns null content on any failure (caller proceeds with thin content).
 */
export async function fetchSourceContent(
  sourceUrl: string
): Promise<ContentFetchResult> {

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(sourceUrl, {
      headers: { Accept: "text/html" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { content: null, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const text = extractMainContent(html);

    // Sanity check: extracted text should be meaningful
    if (text.length < 50) {
      return { content: null, error: "Extracted content too short" };
    }

    return { content: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: null, error: msg };
  }
}
