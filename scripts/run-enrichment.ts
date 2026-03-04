/**
 * run-enrichment.ts
 *
 * CLI wrapper for running the enrichment pipeline during development.
 * Processes unenriched regulatory items — defaults to 10 items for safety.
 *
 * Usage:
 *   npx tsx scripts/run-enrichment.ts
 *   npx tsx scripts/run-enrichment.ts --limit 5
 *   npx tsx scripts/run-enrichment.ts --limit 100
 *   npx tsx scripts/run-enrichment.ts --type recall --limit 20
 *
 * Requires env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_GENERATIVE_AI_API_KEY
 *   OPENAI_API_KEY
 *
 * Pre-requisite:
 *   Run GSRS bootstrap first: npx tsx scripts/bootstrap-gsrs.ts
 *   This seeds 169K FDA substances for live substance resolution.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local before anything else
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
// Validate required env vars
// ---------------------------------------------------------------------------

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENAI_API_KEY",
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error("Missing required env vars:");
  for (const v of missing) console.error(`  ${v}`);
  console.error("Set them in .env.local or export before running.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let limit = 10;
let concurrency = 5;
let itemTypeFilter: string | undefined;
let noCap = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) {
    const n = parseInt(args[i + 1], 10);
    if (isNaN(n) || n < 1) {
      console.error(`Invalid --limit value: ${args[i + 1]}`);
      process.exit(1);
    }
    limit = n;
    i++;
  } else if (args[i] === "--concurrency" && args[i + 1]) {
    const n = parseInt(args[i + 1], 10);
    if (isNaN(n) || n < 1 || n > 20) {
      console.error(`Invalid --concurrency value: ${args[i + 1]} (must be 1-20)`);
      process.exit(1);
    }
    concurrency = n;
    i++;
  } else if (args[i] === "--no-cap") {
    noCap = true;
  } else if (args[i] === "--type" && args[i + 1]) {
    itemTypeFilter = args[i + 1];
    i++;
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
Usage: npx tsx scripts/run-enrichment.ts [options]

Options:
  --limit N         Max items to process (default: 10, cap: 2000)
  --concurrency N   Parallel items (default: 5, max: 20)
  --no-cap          Remove the 2000-item safety cap (for background runs)
  --type TYPE       Filter by item_type (recall, rule, warning_letter, etc.)
  --help            Show this help

Examples:
  npx tsx scripts/run-enrichment.ts                              # enrich up to 10 items
  npx tsx scripts/run-enrichment.ts --limit 100 --concurrency 10 # 100 items, 10 parallel
  npx tsx scripts/run-enrichment.ts --type recall                # only recalls (up to 10)
  nohup npx tsx scripts/run-enrichment.ts --limit 8000 --no-cap &  # background full run
`);
    process.exit(0);
  }
}

if (!noCap && limit > 2000) {
  console.error(`--limit ${limit} exceeds safety cap of 2000. Use --no-cap for background runs.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nEnrichment pipeline`);
  console.log(`Limit: ${limit} items | Concurrency: ${concurrency}${itemTypeFilter ? ` | Type filter: ${itemTypeFilter}` : ""}`);
  console.log("─".repeat(60));

  const { runEnrichment } = await import("../src/pipeline/enrichment/runner");

  const result = await runEnrichment({
    limit,
    concurrency,
    itemTypeFilter,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  console.log("\n─".repeat(60));
  console.log("Run complete:");
  console.log(JSON.stringify(result, null, 2));

  const rate = result.durationMs > 0
    ? ((result.enriched / result.durationMs) * 1000).toFixed(2)
    : "0";
  console.log(`\nThroughput: ${rate} items/sec`);

  if (result.errors > 0) {
    console.warn(`\nWARN: ${result.errors} items failed enrichment. Check regulatory_items.processing_error for details.`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
