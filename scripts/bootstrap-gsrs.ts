/**
 * bootstrap-gsrs.ts
 *
 * Seed the substances, substance_names, and substance_codes tables from FDA GSRS.
 * FDA Global Substance Registration System: https://gsrs.ncats.nih.gov/
 *
 * Usage:
 *   npx tsx scripts/bootstrap-gsrs.ts              # full bootstrap (substances + names + codes)
 *   npx tsx scripts/bootstrap-gsrs.ts --codes-only  # backfill codes only (substances already loaded)
 *
 * Fetches ~169K substances in pages of 500, inserts canonical names, synonyms, and all codes.
 * Safe to re-run: upserts on conflict, skips existing records.
 * Checkpoint-based resume: kills and restarts continue from the last completed page.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const CHECKPOINT_FILE = resolve(process.cwd(), ".gsrs-checkpoint");

function readCheckpoint(): number {
  // Returns skip offset (number of substances already processed), not page number
  if (!existsSync(CHECKPOINT_FILE)) return 0;
  const val = parseInt(readFileSync(CHECKPOINT_FILE, "utf-8").trim(), 10);
  return isNaN(val) ? 0 : val;
}

function writeCheckpoint(skip: number) {
  // Store skip offset so checkpoint survives page size changes
  writeFileSync(CHECKPOINT_FILE, String(skip), "utf-8");
}

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
const PAGE_SIZE = 500;
const DELAY_MS = 200;      // between pages
const FETCH_TIMEOUT = 60_000; // 60s abort — larger pages need more time

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

// --codes-only flag: skip substance + name upserts, only backfill codes
// Useful when substances are already loaded and you need to add/refresh codes
const CODES_ONLY = process.argv.includes("--codes-only");

// We capture ALL code systems from GSRS into substance_codes.
// Filtering to relevant systems happens at query time in cross-reference.ts (Step 1b).
// This avoids re-running the full bootstrap whenever we need a new code system.
//
// Code systems used by Step 1b (cross-reference inference):
//   CFR, CODEX ALIMENTARIUS (GSFA), JECFA EVALUATION, DSLD, RXCUI,
//   DRUG BANK, DAILYMED, EPA PESTICIDE CODE, Food Contact Sustance Notif (FCN No.)
// See: src/pipeline/enrichment/cross-reference.ts
//
// Code systems NOT in GSRS (need separate sources):
//   COSMETIC INGREDIENT REVIEW (CIR) — cosmetic ingredient data

interface GsrsCode {
  codeSystem: string;
  code: string;
  type?: string;
  _isClassification?: boolean;
  comments?: string;
}

interface GsrsSubstance {
  uuid: string;
  _name: string;
  substanceClass: string;
  codes?: GsrsCode[];
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
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
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

  const startSkip = readCheckpoint();
  const mode = CODES_ONLY ? "codes-only" : "full";
  console.log(`Starting GSRS bootstrap [${mode}]${startSkip > 0 ? ` (resuming from skip=${startSkip})` : ""}...`);

  // Always fetch page 0 to get total count
  const probePage = await fetchPage(0);
  const total = probePage.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`Total substances: ${total}, pages: ${totalPages} (${PAGE_SIZE}/page)`);

  let inserted = 0;
  let skipped = 0;
  let codesInserted = 0;
  let errors = 0;

  // Start from checkpoint skip offset (page-size-agnostic resume)
  const loopStart = Math.floor(startSkip / PAGE_SIZE) * PAGE_SIZE;
  let pageNum = Math.floor(loopStart / PAGE_SIZE);

  for (let skip = loopStart; skip < total; skip += PAGE_SIZE, pageNum++) {
    try {
      const data = skip === 0 ? probePage : await fetchPage(skip);
      const result = await processPage(supabase, data);
      inserted += result.inserted;
      skipped += result.skipped;
      codesInserted += result.codesInserted;
      writeCheckpoint(skip + PAGE_SIZE);
    } catch (err) {
      console.error(`Page ${pageNum} (skip=${skip}) error:`, err);
      errors++;
    }

    if ((pageNum + 1) % 10 === 0) {
      console.log(
        `Progress: page ${pageNum + 1}/${totalPages} | inserted: ${inserted} | codes: ${codesInserted} | skipped: ${skipped} | errors: ${errors}`
      );
    }

    if (skip + PAGE_SIZE < total) await sleep(DELAY_MS);
  }

  console.log("\nGSRS bootstrap complete.");
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Codes:    ${codesInserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  // Clean up checkpoint on successful completion
  if (existsSync(CHECKPOINT_FILE)) writeFileSync(CHECKPOINT_FILE, "", "utf-8");
}

async function processPage(
  supabase: ReturnType<typeof createClient>,
  data: GsrsPage
): Promise<{ inserted: number; skipped: number; codesInserted: number }> {
  let inserted = 0;
  let skipped = 0;
  let codesInserted = 0;

  // 1. Batch upsert all substances in the page (skip in codes-only mode)
  const canonicalNames = data.content.map((s) => s._name);

  if (!CODES_ONLY) {
    const substanceRows = data.content.map((s) => ({
      canonical_name: s._name,
      unii: extractCode(s, "FDA UNII"),
      cas_number: extractCode(s, "CAS"),
      substance_class: SUBSTANCE_CLASS_MAP[s.substanceClass?.toLowerCase()] ?? null,
    }));

    const { error: upsertErr } = await supabase.from("substances").upsert(substanceRows, {
      onConflict: "canonical_name",
      ignoreDuplicates: true,
    });
    if (upsertErr) throw new Error(`substances upsert: ${upsertErr.message}`);
  }

  // 2. Fetch IDs back for code insertion (always needed)
  // Batch in chunks of 50 to avoid URL length limits on .in() with long substance names
  const allRows: Array<{ id: string; canonical_name: string }> = [];
  const ID_BATCH = 50;
  for (let i = 0; i < canonicalNames.length; i += ID_BATCH) {
    const batch = canonicalNames.slice(i, i + ID_BATCH);
    const { data: batchRows } = await supabase
      .from("substances")
      .select("id, canonical_name")
      .in("canonical_name", batch);
    if (batchRows) allRows.push(...batchRows);
  }

  if (allRows.length === 0) return { inserted: skipped, skipped, codesInserted };

  const nameToId = Object.fromEntries(allRows.map((r) => [r.canonical_name, r.id]));

  // 3. Batch upsert all names for the page (skip in codes-only mode)
  const nameRows: Array<{ substance_id: string; name: string; name_type: string; language: string; source: string }> = [];

  // 4. Collect ALL codes for substance_codes table (no system filter — capture everything)
  const codeRows: Array<{
    substance_id: string;
    code_system: string;
    code_value: string;
    code_type: string | null;
    is_classification: boolean;
    comments: string | null;
  }> = [];

  for (const s of data.content) {
    const substanceId = nameToId[s._name];
    if (!substanceId) { skipped++; continue; }

    if (!CODES_ONLY) {
      for (const n of s.names ?? []) {
        if (!n.name?.trim()) continue;
        nameRows.push({
          substance_id: substanceId,
          name: n.name,
          name_type: NAME_TYPE_MAP[n.type?.toLowerCase()] ?? "common",
          language: n.languages?.[0]?.slice(0, 2) ?? "en",
          source: "gsrs",
        });
      }
    }

    // Capture all codes — filtering happens at query time in cross-reference.ts
    for (const c of s.codes ?? []) {
      if (!c.code?.trim()) continue;

      codeRows.push({
        substance_id: substanceId,
        code_system: c.codeSystem,
        code_value: c.code.trim(),
        code_type: c.type ?? null,
        is_classification: c._isClassification ?? false,
        comments: c.comments ?? null,
      });
    }

    inserted++;
  }

  if (!CODES_ONLY && nameRows.length > 0) {
    const { error: namesErr } = await supabase.from("substance_names").upsert(nameRows, {
      onConflict: "substance_id,name",
      ignoreDuplicates: true,
    });
    if (namesErr) throw new Error(`substance_names upsert: ${namesErr.message}`);
  }

  // 5. Batch upsert codes into substance_codes
  if (codeRows.length > 0) {
    // Supabase has a ~1000 row limit per request, batch if needed
    const BATCH_SIZE = 500;
    for (let i = 0; i < codeRows.length; i += BATCH_SIZE) {
      const batch = codeRows.slice(i, i + BATCH_SIZE);
      const { error: codesErr } = await supabase.from("substance_codes").upsert(batch, {
        onConflict: "substance_id,code_system,code_value",
        ignoreDuplicates: true,
      });
      if (codesErr) throw new Error(`substance_codes upsert: ${codesErr.message}`);
    }
    codesInserted += codeRows.length;
  }

  return { inserted, skipped, codesInserted };
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
