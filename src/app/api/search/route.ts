import { z } from "zod";
import { headers } from "next/headers";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/openai";
import { claudeSonnet } from "@/lib/ai/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { track, trackLLM } from "@/lib/analytics";
import { isDev } from "@/lib/dev";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const SearchSchema = z.object({
  query: z.string().min(3).max(500),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Rate limit
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(`search:${ip}`, 10)) {
    return Response.json(
      { error: { message: "Too many requests. Please wait a moment." } },
      { status: 429 }
    );
  }

  // 2. Auth check
  let userId: string | null = null;
  if (!isDev) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  // 3. Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const result = SearchSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: { message: "Query must be between 3 and 500 characters." } },
      { status: 400 }
    );
  }

  const { query } = result.data;

  // 4. Generate embedding
  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch (err) {
    console.error("[search] Embedding generation failed:", err);
    return Response.json(
      { error: { message: "Search is temporarily unavailable." } },
      { status: 503 }
    );
  }

  // 5. Vector search via Supabase RPC
  const supabase = await createClient();
  let chunks: Array<{
    id: string;
    item_id: string;
    content: string;
    section_title: string | null;
    similarity: number;
  }> | null = null;

  try {
    const { data, error } = await supabase.rpc("match_item_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.65,
      match_count: 8,
    });

    if (error) {
      // RPC function may not exist yet — handle gracefully
      console.warn("[search] RPC match_item_chunks failed:", error.message);
      chunks = null;
    } else {
      chunks = data;
    }
  } catch (err) {
    console.warn("[search] RPC call threw:", err);
    chunks = null;
  }

  // 6. No chunks — return "no data yet" response
  if (!chunks || chunks.length === 0) {
    return Response.json({
      answer:
        "Not enough regulatory data indexed yet. Check back as the database grows.",
      citations: [],
    });
  }

  // 7. Build RAG context from chunks
  const contextBlocks = chunks.map(
    (c, i) =>
      `[Source ${i + 1}] (item_id: ${c.item_id})\n${c.section_title ? `Section: ${c.section_title}\n` : ""}${c.content}`
  );

  const systemPrompt = `You are a regulatory intelligence analyst for Policy Canary, an FDA monitoring service that tracks regulatory changes across all FDA-regulated product categories — food, supplements, cosmetics, pharmaceuticals, medical devices, biologics, tobacco, and veterinary products. Answer the user's question using ONLY the provided source context. Be precise, specific, and calibrated. When interpretation is ambiguous, say so. Always reference specific regulations (e.g., 21 CFR 111.75) when available. Use short paragraphs and numbered lists for clarity. Do not fabricate information not present in the sources.`;

  const userPrompt = `Question: ${query}\n\nSource context:\n${contextBlocks.join("\n\n---\n\n")}`;

  // 8. Fetch item metadata for citations
  const itemIds = [...new Set(chunks.map((c) => c.item_id))];
  const { data: items } = await supabase
    .from("regulatory_items")
    .select("id, title, item_type, published_date")
    .in("id", itemIds);

  const citations = (items ?? []).map((item) => {
    const chunk = chunks!.find((c) => c.item_id === item.id);
    return {
      item_id: item.id,
      title: item.title,
      item_type: item.item_type,
      published_date: item.published_date,
      chunk_content: chunk?.content?.slice(0, 200) ?? "",
      score: chunk?.similarity ?? 0,
    };
  });

  // 9. Generate answer with Claude
  try {
    const { text } = await trackLLM(userId, "search_answer", "claude-sonnet", () =>
      generateText({
        model: claudeSonnet,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 1024,
      })
    );

    track(userId, "search_query", {
      query_length: query.length,
      chunk_count: chunks.length,
      citation_count: citations.length,
    });

    return Response.json({
      answer: text,
      citations,
    });
  } catch (err) {
    console.error("[search] LLM generation failed:", err);
    return Response.json(
      { error: { message: "Answer generation failed. Please try again." } },
      { status: 503 }
    );
  }
}
