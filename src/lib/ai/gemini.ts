import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error("Missing env var: GOOGLE_GENERATIVE_AI_API_KEY is required");
}

const google = createGoogleGenerativeAI({ apiKey });

/**
 * geminiFlash — high-volume tasks: segment tagging, topic classification, simple summarization.
 * Cost: ~$0.15/1M input, ~$0.60/1M output
 */
export const geminiFlash = google("gemini-2.5-flash");

/**
 * geminiPro — complex tasks: impact analysis, action item extraction, regulatory nuance.
 * Cost: ~$1.25/1M input, ~$10/1M output
 */
export const geminiPro = google("gemini-2.5-pro");
