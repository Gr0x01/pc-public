import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error("Missing env var: GOOGLE_GENERATIVE_AI_API_KEY is required");
}

const google = createGoogleGenerativeAI({ apiKey });

/**
 * geminiFlash — high-volume tasks: category tagging, topic classification, simple summarization.
 */
export const geminiFlash = google("gemini-3-flash-preview");

/**
 * geminiPro — complex tasks: impact analysis, action item extraction, regulatory nuance.
 */
export const geminiPro = google("gemini-3.1-pro-preview");
