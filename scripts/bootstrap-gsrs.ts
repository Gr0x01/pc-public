/**
 * bootstrap-gsrs.ts
 *
 * One-time script to seed the substances + substance_names tables from FDA GSRS.
 * FDA Global Substance Registration System: https://gsrs.ncats.nih.gov/
 *
 * Run once during initial setup:
 *   npx tsx scripts/bootstrap-gsrs.ts
 *
 * Fetches ~169K substances in pages of 100, inserts canonical names and synonyms.
 * Safe to re-run: upserts on UNII conflict, skips existing records.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local before reading env vars
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const GSRS_API = "https://gsrs.ncats.nih.gov/api/v1/substances";
const PAGE_SIZE = 100;
const DELAY_MS = 50; // minimal delay — sequential fetches provide natural throttling

// Substance class mapping from GSRS to our schema
const SUBSTANCE_CLASS_MAP: Record<string, string> = {
  chemical: "chemical",
  protein: "protein",
  mixture: "mixture",
  polymer: "polymer",
  "nucleic acid": "nucleic_acid",
  structurally_diverse: "botanical", // most structurally diverse = botanical extracts
};

// Name type mapping from GSRS
const NAME_TYPE_MAP: Record<string, string> = {
  of: "preferred", // official name
  sys: "systematic",
  cn: "common",
  bn: "brand",
  cd: "abbreviation",
};

interface GsrsSubstance {
  uuid: string;
  _name: string;
  substanceClass: string;
  codes?: Array<{ codeSystem: string; code: string }>;
  names?: Array<{ name: string; type: string; preferred?: boolean; languages?: string[] }>;
}

interface GsrsPage {
  content: GsrsSubstance[];
  total: number;   // was totalElements
  count: number;   // items in this page
  skip: number;
  top: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCode(substance: GsrsSubstance, system: string): string | null {
  const code = substance.codes?.find((c) => c.codeSystem === system);
  return code?.code ?? null;
}

async function fetchPage(skip: number): Promise<GsrsPage> {
  const url = `${GSRS_API}?skip=${skip}&top=${PAGE_SIZE}&view=full`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GSRS API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<GsrsPage>;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("Set them in .env.local or export them before running.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  console.log("Starting GSRS bootstrap...");

  // Probe first page to get total
  const firstPage = await fetchPage(0);
  const total = firstPage.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`Total substances: ${total}, pages: ${totalPages}`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    let data: GsrsPage;
    const skip = pageNum * PAGE_SIZE;

    if (pageNum === 0) {
      data = firstPage;
    } else {
      await sleep(DELAY_MS);
      try {
        data = await fetchPage(skip);
      } catch (err) {
        console.error(`Failed to fetch page ${pageNum} (skip=${skip}):`, err);
        errors++;
        continue;
      }
    }

    for (const substance of data.content) {
      const unii = extractCode(substance, "FDA UNII");
      const cas = extractCode(substance, "CAS");
      const substanceClass =
        SUBSTANCE_CLASS_MAP[substance.substanceClass?.toLowerCase()] ?? null;

      // Upsert the canonical substance
      const { data: row, error: subError } = await supabase
        .from("substances")
        .upsert(
          {
            canonical_name: substance._name,
            unii: unii,
            cas_number: cas,
            substance_class: substanceClass,
          },
          {
            onConflict: "unii",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      if (subError || !row) {
        // Try insert without UNII constraint (non-UNII substances)
        const { data: insertedRow, error: insertError } = await supabase
          .from("substances")
          .insert({
            canonical_name: substance._name,
            unii: unii,
            cas_number: cas,
            substance_class: substanceClass,
          })
          .select("id")
          .single();

        if (insertError) {
          skipped++;
          continue;
        }

        if (!insertedRow) {
          skipped++;
          continue;
        }

        await insertNames(supabase, insertedRow.id, substance);
        inserted++;
      } else {
        await insertNames(supabase, row.id, substance);
        inserted++;
      }
    }

    if (pageNum % 10 === 0) {
      console.log(
        `Progress: page ${pageNum + 1}/${totalPages} | inserted: ${inserted} | skipped: ${skipped} | errors: ${errors}`
      );
    }
  }

  console.log("\nGSRS bootstrap complete.");
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
}

async function insertNames(
  supabase: ReturnType<typeof createClient>,
  substanceId: string,
  substance: GsrsSubstance
) {
  const names = substance.names ?? [];
  if (names.length === 0) return;

  const nameRows = names.map((n) => ({
    substance_id: substanceId,
    name: n.name,
    name_type: NAME_TYPE_MAP[n.type?.toLowerCase()] ?? "common",
    language: n.languages?.[0]?.slice(0, 2) ?? "en",
    source: "gsrs",
  }));

  // Batch insert, ignore duplicates
  const { error } = await supabase.from("substance_names").upsert(nameRows, {
    onConflict: "substance_id,name",
    ignoreDuplicates: true,
  });

  if (error) {
    console.warn(`Failed to insert names for substance ${substanceId}:`, error.message);
  }
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
