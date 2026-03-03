/**
 * run-fetcher.ts
 *
 * CLI wrapper for running pipeline fetchers during development.
 * Runs a narrow test window (2025-01-01 → 2025-02-01) to validate
 * against real data without flooding the database.
 *
 * Usage:
 *   npx tsx scripts/run-fetcher.ts fr-backfill
 *   npx tsx scripts/run-fetcher.ts enforcement-backfill
 *   npx tsx scripts/run-fetcher.ts wl-backfill
 *   npx tsx scripts/run-fetcher.ts wl-incremental
 *   npx tsx scripts/run-fetcher.ts rss-poll
 *
 * Requires env vars in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
// Validate env + build Supabase client
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required env vars:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  console.error("Set them in .env.local or export before running.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const command = process.argv[2];
const TEST_START = "2025-01-01";
const TEST_END = "2025-02-01";

async function main() {
  if (!command) {
    console.error(
      "Usage: npx tsx scripts/run-fetcher.ts [fr-backfill|enforcement-backfill|wl-backfill|wl-incremental|rss-poll]"
    );
    process.exit(1);
  }

  if (command === "fr-backfill") {
    const { fetchFederalRegister } = await import("../src/pipeline/fetchers/federal-register");
    console.log(`Running Federal Register backfill (${TEST_START} → ${TEST_END})...\n`);
    const result = await fetchFederalRegister(supabase, {
      mode: "backfill",
      startDate: TEST_START,
      endDate: TEST_END,
    });
    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "enforcement-backfill") {
    const { fetchOpenFDAEnforcement } = await import(
      "../src/pipeline/fetchers/openfda-enforcement"
    );
    console.log(`Running openFDA enforcement backfill (${TEST_START} → ${TEST_END})...\n`);
    const result = await fetchOpenFDAEnforcement(supabase, {
      mode: "backfill",
      startDate: TEST_START,
      endDate: TEST_END,
    });
    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "wl-backfill") {
    const { fetchWarningLetters } = await import("../src/pipeline/fetchers/warning-letters");
    console.log("Running warning letters backfill (all records)...\n");
    const result = await fetchWarningLetters(supabase, { mode: "backfill" });
    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "wl-incremental") {
    const { fetchWarningLetters } = await import("../src/pipeline/fetchers/warning-letters");
    console.log("Running warning letters incremental (most recent, stops on known page)...\n");
    const result = await fetchWarningLetters(supabase, { mode: "incremental" });
    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "rss-poll") {
    const { fetchFdaRss } = await import("../src/pipeline/fetchers/fda-rss");
    console.log("Polling FDA RSS feeds...\n");
    const result = await fetchFdaRss(supabase, { mode: "poll" });
    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`Unknown command: "${command}"`);
    console.error(
      "Available commands: fr-backfill, enforcement-backfill, wl-backfill, wl-incremental, rss-poll"
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
