import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing env var: OPENAI_API_KEY is required");
}

const openai = createOpenAI({ apiKey });

/**
 * Embedding model — text-embedding-3-small produces 1536-dimensional vectors.
 * Matches halfvec(1536) column in item_chunks.
 * Cost: ~$0.02/1M tokens
 */
const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate a 1536-dimensional embedding for the given text.
 * Used for item_chunks and semantic search.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

export { embeddingModel };
