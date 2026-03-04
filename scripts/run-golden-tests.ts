/**
 * run-golden-tests.ts
 *
 * Validates the enrichment pipeline against 10 golden fixture items.
 * Two modes:
 *   --validate   Check existing enrichment data in DB (no LLM calls, free)
 *   --enrich     Enrich items first, then validate (costs LLM tokens)
 *
 * Usage:
 *   npx tsx scripts/run-golden-tests.ts              # validate existing
 *   npx tsx scripts/run-golden-tests.ts --enrich      # enrich + validate
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 * With --enrich: also GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Imports (after env loaded)
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  GOLDEN_FIXTURES,
  type GoldenFixture,
} from "../tests/golden/fixtures";
import { enrichItem, loadCategoryIdMap } from "../src/pipeline/enrichment/processor";
import { generateItemEmbeddings } from "../src/pipeline/enrichment/embeddings";
import { fetchSourceContent } from "../src/pipeline/enrichment/content-fetch";
import type { RegulatoryItem } from "../src/types/database";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const doEnrich = process.argv.includes("--enrich");

/**
 * Fuzzy match for product types and ingredients.
 * Checks substring inclusion OR significant word overlap (>= 50% of expected words).
 * "male enhancement supplement" matches "male energy supplement" (2/3 words).
 * "raw vegetable" matches "vegetables" (root overlap).
 */
function fuzzyMatch(expected: string, actual: string): boolean {
  const e = expected.toLowerCase();
  const a = actual.toLowerCase();

  // Substring match (either direction)
  if (a.includes(e) || e.includes(a)) return true;

  // Word overlap: split both, check if enough expected words appear in actual
  const expectedWords = e.split(/\s+/).filter((w) => w.length > 2);
  const actualWords = a.split(/\s+/).filter((w) => w.length > 2);
  if (expectedWords.length === 0) return false;

  let matches = 0;
  for (const ew of expectedWords) {
    if (actualWords.some((aw) => aw.includes(ew) || ew.includes(aw))) {
      matches++;
    }
  }

  // Pass if >= 50% of expected words match
  return matches / expectedWords.length >= 0.5;
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

interface AssertionResult {
  field: string;
  pass: boolean;
  detail: string;
}

function validate(
  fixture: GoldenFixture,
  enrichment: {
    regulatory_action_type: string;
    confidence: number;
    deadline: string | null;
    raw_response: Record<string, unknown>;
  },
  substances: Array<{ raw_substance_name: string }>,
  tags: Array<{ tag_dimension: string; tag_value: string }>
): AssertionResult[] {
  const results: AssertionResult[] = [];
  const raw = enrichment.raw_response as Record<string, unknown>;

  // 1. regulatory_action_type — exact match
  results.push({
    field: "regulatory_action_type",
    pass: enrichment.regulatory_action_type === fixture.expected.regulatory_action_type,
    detail: `expected=${fixture.expected.regulatory_action_type} actual=${enrichment.regulatory_action_type}`,
  });

  // 2. affected_ingredients — every expected must appear (case-insensitive)
  const actualIngredients = [
    ...substances.map((s) => s.raw_substance_name.toLowerCase()),
    ...((raw.affected_ingredients as string[]) ?? []).map((s: string) => s.toLowerCase()),
  ];

  for (const expected of fixture.expected.affected_ingredients) {
    const found = actualIngredients.some((actual) => fuzzyMatch(expected, actual));
    results.push({
      field: `ingredient: "${expected}"`,
      pass: found,
      detail: found
        ? `found in ${actualIngredients.length} ingredients`
        : `NOT FOUND in [${actualIngredients.join(", ")}]`,
    });
  }

  // 3. affected_product_categories — every expected must appear (fuzzy substring)
  const actualProductTypes = [
    ...tags.filter((t) => t.tag_dimension === "product_type").map((t) => t.tag_value.toLowerCase()),
    ...((raw.affected_product_categories as string[]) ?? []).map((s: string) => s.toLowerCase()),
  ];

  for (const expected of fixture.expected.affected_product_categories) {
    const found = actualProductTypes.some((actual) => fuzzyMatch(expected, actual));
    results.push({
      field: `product_type: "${expected}"`,
      pass: found,
      detail: found
        ? `found in ${actualProductTypes.length} types`
        : `NOT FOUND in [${actualProductTypes.join(", ")}]`,
    });
  }

  // 4. has_deadline
  const actualHasDeadline = enrichment.deadline !== null;
  results.push({
    field: "has_deadline",
    pass: actualHasDeadline === fixture.expected.has_deadline,
    detail: `expected=${fixture.expected.has_deadline} actual=${actualHasDeadline}`,
  });

  // 5. confidence
  results.push({
    field: "confidence",
    pass: enrichment.confidence >= fixture.expected.min_confidence,
    detail: `expected>=${fixture.expected.min_confidence} actual=${enrichment.confidence}`,
  });

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log(`\nGolden Fixture Tests — ${GOLDEN_FIXTURES.length} items`);
  console.log(`Mode: ${doEnrich ? "ENRICH + VALIDATE" : "VALIDATE EXISTING"}`);
  console.log("═".repeat(70));

  // If enriching, we need LLM credentials + category map
  let google: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  let categoryIdMap: Awaited<ReturnType<typeof loadCategoryIdMap>> | null = null;

  if (doEnrich) {
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
    const openaiApiKey = process.env.OPENAI_API_KEY ?? "";
    if (!googleApiKey) {
      console.error("--enrich requires GOOGLE_GENERATIVE_AI_API_KEY");
      process.exit(1);
    }
    if (!openaiApiKey) {
      console.error("--enrich requires OPENAI_API_KEY");
      process.exit(1);
    }
    google = createGoogleGenerativeAI({ apiKey: googleApiKey });
    categoryIdMap = await loadCategoryIdMap(supabase);
  }

  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;
  const failedFixtures: string[] = [];

  for (const fixture of GOLDEN_FIXTURES) {
    console.log(`\n${fixture.label}`);
    console.log(`  id: ${fixture.id} | type: ${fixture.item_type}`);

    // Fetch the item from DB
    const { data: item, error: itemErr } = await supabase
      .from("regulatory_items")
      .select("*")
      .eq("id", fixture.id)
      .single();

    if (itemErr || !item) {
      console.log(`  ⊘ SKIP — item not found in DB`);
      totalSkip++;
      continue;
    }

    // If --enrich, run enrichment on this item
    if (doEnrich && google && categoryIdMap) {
      // Delete existing enrichment so we can re-enrich
      await supabase.from("item_enrichments").delete().eq("item_id", fixture.id);
      await supabase.from("regulatory_item_substances").delete().eq("regulatory_item_id", fixture.id);
      await supabase.from("item_enrichment_tags").delete().eq("item_id", fixture.id);
      await supabase.from("item_citations").delete().eq("item_id", fixture.id);
      await supabase.from("item_chunks").delete().eq("item_id", fixture.id);
      await supabase
        .from("regulatory_items")
        .update({ processing_status: "ok" })
        .eq("id", fixture.id);

      // Fetch full page content for thin RSS items before enriching
      const typedItem = item as RegulatoryItem;
      if (typedItem.source_url && /^https?:\/\/www\.fda\.gov\//.test(typedItem.source_url)) {
        process.stdout.write("  fetching page content... ");
        const { content, error: fetchErr } = await fetchSourceContent(typedItem.source_url);
        if (content && content.length > (typedItem.raw_content?.length ?? 0)) {
          await supabase
            .from("regulatory_items")
            .update({ raw_content: content })
            .eq("id", typedItem.id);
          typedItem.raw_content = content;
          console.log(`${content.length} chars`);
        } else {
          console.log(fetchErr ? `skipped (${fetchErr})` : "existing content longer");
        }
      }

      process.stdout.write("  enriching... ");
      const result = await enrichItem(
        typedItem,
        supabase,
        categoryIdMap,
        google
      );

      if (!result.ok) {
        console.log(`ERROR: ${result.error}`);
        totalFail++;
        failedFixtures.push(fixture.label);
        continue;
      }

      // Generate embeddings too
      try {
        await generateItemEmbeddings(
          item as RegulatoryItem,
          supabase,
          process.env.OPENAI_API_KEY!
        );
      } catch {
        // Non-fatal for golden tests
      }

      console.log("done");
    }

    // Read enrichment data from DB
    const { data: enrichment } = await supabase
      .from("item_enrichments")
      .select("regulatory_action_type, confidence, deadline, raw_response")
      .eq("item_id", fixture.id)
      .order("enrichment_version", { ascending: false })
      .limit(1)
      .single();

    if (!enrichment) {
      console.log(`  ⊘ SKIP — no enrichment data (run with --enrich)`);
      totalSkip++;
      continue;
    }

    // Read substances
    const { data: substances } = await supabase
      .from("regulatory_item_substances")
      .select("raw_substance_name")
      .eq("regulatory_item_id", fixture.id);

    // Read tags
    const { data: tags } = await supabase
      .from("item_enrichment_tags")
      .select("tag_dimension, tag_value")
      .eq("item_id", fixture.id);

    // Validate
    const assertions = validate(
      fixture,
      enrichment as {
        regulatory_action_type: string;
        confidence: number;
        deadline: string | null;
        raw_response: Record<string, unknown>;
      },
      (substances ?? []) as Array<{ raw_substance_name: string }>,
      (tags ?? []) as Array<{ tag_dimension: string; tag_value: string }>
    );

    let fixturePass = true;
    for (const a of assertions) {
      const icon = a.pass ? "✓" : "✗";
      console.log(`  ${icon} ${a.field} — ${a.detail}`);
      if (a.pass) {
        totalPass++;
      } else {
        totalFail++;
        fixturePass = false;
      }
    }

    if (!fixturePass) {
      failedFixtures.push(fixture.label);
    }
  }

  // Summary
  console.log("\n" + "═".repeat(70));
  console.log(`RESULTS: ${totalPass} passed, ${totalFail} failed, ${totalSkip} skipped`);

  if (failedFixtures.length > 0) {
    console.log("\nFailed fixtures:");
    for (const f of failedFixtures) {
      console.log(`  ✗ ${f}`);
    }
  }

  if (totalFail > 0) {
    process.exit(1);
  } else if (totalSkip === GOLDEN_FIXTURES.length) {
    console.log("\nAll items skipped — no enrichment data. Run with --enrich first.");
    process.exit(2);
  } else {
    console.log("\nAll assertions passed.");
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
