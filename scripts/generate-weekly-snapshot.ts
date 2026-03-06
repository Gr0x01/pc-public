/**
 * Generate a weekly intelligence snapshot for the homepage.
 * Usage:
 *   npx tsx scripts/generate-weekly-snapshot.ts                    # Most recent Mon-Fri
 *   npx tsx scripts/generate-weekly-snapshot.ts --start 2026-02-24 # Specific week start (Mon)
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

// Load .env.local before anything else
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

// Stub out server-only by creating a no-op version in node_modules
// This is the same technique used by other scripts in the project
const serverOnlyPath = resolve(
  process.cwd(),
  "node_modules/server-only/index.js"
);
const serverOnlyBackup = readFileSync(serverOnlyPath, "utf-8");
writeFileSync(serverOnlyPath, "// stubbed for CLI\n");

async function main() {
  try {
    const { generateWeeklySnapshot } = await import(
      "@/lib/intelligence/weekly-snapshot"
    );

    const args = process.argv.slice(2);
    const startIdx = args.indexOf("--start");
    let weekStart: Date | undefined;
    let weekEnd: Date | undefined;

    if (startIdx !== -1 && args[startIdx + 1]) {
      weekStart = new Date(args[startIdx + 1]);
      weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4);
    }

    console.log(
      weekStart
        ? `Generating snapshot for week of ${weekStart.toISOString().slice(0, 10)}...`
        : "Generating snapshot for most recent Mon-Fri..."
    );

    const snapshot = await generateWeeklySnapshot(weekStart, weekEnd);

    console.log("\n--- Weekly Intelligence Snapshot ---");
    console.log(`Week: ${snapshot.week_start} to ${snapshot.week_end}`);
    console.log(`Items: ${snapshot.total_items}`);
    console.log(`Sectors: ${snapshot.total_sectors}`);
    console.log(`Substances flagged: ${snapshot.total_substances_flagged}`);
    console.log(`Deadlines: ${snapshot.total_deadlines}`);
    console.log(`\nSector breakdown:`);
    for (const [sector, count] of Object.entries(snapshot.sector_counts).sort(
      ([, a], [, b]) => b - a
    )) {
      console.log(`  ${sector}: ${count}`);
    }
    console.log(`\nNarrative:\n${snapshot.narrative}`);
    console.log(`\nShowcase items:`);
    for (const item of snapshot.showcase_items) {
      console.log(`  - [${item.item_type}] ${item.title}`);
      console.log(`    Company: ${item.company_name ?? "N/A"}`);
      console.log(
        `    Ingredients: ${item.affected_ingredients.join(", ") || "none"}`
      );
      console.log(
        `    Categories: ${item.affected_product_categories.join(", ") || "none"}`
      );
      console.log(`    Deadline: ${item.deadline ?? "none"}`);
    }
  } finally {
    // Restore server-only module
    writeFileSync(serverOnlyPath, serverOnlyBackup);
  }
}

main().catch((err) => {
  // Restore server-only even on error
  writeFileSync(serverOnlyPath, serverOnlyBackup);
  console.error("Failed:", err);
  process.exit(1);
});
