import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error("Missing env var: ANTHROPIC_API_KEY is required");
}

const anthropic = createAnthropic({ apiKey });

/**
 * claudeSonnet — email intelligence writing, AI search synthesis, editorial voice.
 * Cost: ~$3/1M input, ~$15/1M output
 * DO NOT change this model without explicit authorization.
 */
export const claudeSonnet = anthropic("claude-sonnet-4-6");

/**
 * claudeHaiku — fast, cheap tasks: vision fallback, simple classification.
 * Cost: ~$1/1M input, ~$5/1M output
 * DO NOT change this model without explicit authorization.
 */
export const claudeHaiku = anthropic("claude-haiku-4-5-20251001");
