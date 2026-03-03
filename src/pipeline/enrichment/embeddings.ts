/**
 * Embedding generation for item_chunks.
 *
 * Chunks raw_content at paragraph boundaries, generates halfvec(1536) embeddings
 * via OpenAI text-embedding-3-small, and inserts into item_chunks.
 */

import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegulatoryItem } from "../../types/database";
import { sleep } from "../fetchers/utils";

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

const TARGET_CHUNK_CHARS = 2000; // ~500 tokens
const MAX_CHUNK_CHARS = 4000;    // ~1000 tokens

/**
 * Split text into chunks at paragraph boundaries.
 * Preserves context by not mid-paragraph cutting.
 */
function chunkText(text: string): Array<{ content: string; section_title: string }> {
  if (!text.trim()) return [];

  // Split at double newlines (paragraph breaks)
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: Array<{ content: string; section_title: string }> = [];
  let current = "";
  let chunkIndex = 0;

  for (const para of paragraphs) {
    // If adding this paragraph would exceed target, flush current chunk
    if (current.length > 0 && current.length + para.length > TARGET_CHUNK_CHARS) {
      chunks.push({
        content: current.trim(),
        section_title: `Section ${chunkIndex + 1}`,
      });
      chunkIndex++;
      current = "";
    }

    // If a single paragraph exceeds max, split it at sentence boundaries
    if (para.length > MAX_CHUNK_CHARS) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceChunk = "";

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > TARGET_CHUNK_CHARS && sentenceChunk) {
          chunks.push({
            content: sentenceChunk.trim(),
            section_title: `Section ${chunkIndex + 1}`,
          });
          chunkIndex++;
          sentenceChunk = "";
        }
        sentenceChunk += (sentenceChunk ? " " : "") + sentence;
      }

      if (sentenceChunk.trim()) {
        current += (current ? "\n\n" : "") + sentenceChunk;
      }
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  // Flush remaining
  if (current.trim()) {
    chunks.push({
      content: current.trim(),
      section_title: `Section ${chunkIndex + 1}`,
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateItemEmbeddings(
  item: RegulatoryItem,
  supabase: SupabaseClient,
  openaiApiKey: string
): Promise<void> {
  const content = [item.title, item.action_text, item.raw_content]
    .filter(Boolean)
    .join("\n\n");

  if (!content.trim()) return;

  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  const openai = createOpenAI({ apiKey: openaiApiKey });
  const embeddingModel = openai.embedding("text-embedding-3-small");

  // Process in batches of 20 with delay between batches
  const BATCH_SIZE = 20;

  for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
    const batch = chunks.slice(batchStart, batchStart + BATCH_SIZE);
    const texts = batch.map((c) => c.content);

    let embeddings: number[][];

    if (texts.length === 1) {
      const { embedding } = await embed({ model: embeddingModel, value: texts[0] });
      embeddings = [embedding];
    } else {
      const { embeddings: multi } = await embedMany({ model: embeddingModel, values: texts });
      embeddings = multi;
    }

    const rows = batch.map((chunk, i) => {
      const vec = embeddings[i];
      if (vec.length !== 1536) {
        throw new Error(`Unexpected embedding dimension: ${vec.length} (expected 1536)`);
      }
      return {
        item_id: item.id,
        chunk_index: batchStart + i,
        section_title: chunk.section_title,
        content: chunk.content,
        embedding: `[${vec.join(",")}]`, // halfvec literal format for Supabase PostgREST
        token_count: Math.ceil(chunk.content.length / 4),
      };
    });

    await supabase.from("item_chunks").insert(rows);

    // Rate limit: pause between batches (not after the last one)
    if (batchStart + BATCH_SIZE < chunks.length) {
      await sleep(200);
    }
  }
}
