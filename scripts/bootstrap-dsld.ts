/**
 * Bootstrap DSLD (Dietary Supplement Label Database) into Supabase
 *
 * Imports the full NIH DSLD database from CSV files:
 * - ProductOverview (214K products)
 * - DietarySupplementFacts (2M ingredient rows)
 * - OtherIngredients (214K rows)
 * - CompanyInformation (253K rows)
 * - LabelStatements (1.4M rows)
 *
 * Usage:
 *   npx tsx scripts/bootstrap-dsld.ts                    # Import all tables
 *   npx tsx scripts/bootstrap-dsld.ts --products-only    # Just products (for testing)
 *   npx tsx scripts/bootstrap-dsld.ts --table=ingredients # Single table
 *
 * Requires: CSV files extracted to tmp/DSLD-csv/
 * Source: https://dsld.od.nih.gov/ → Download entire database (CSV)
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

// Load env
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CSV_DIR = path.resolve(process.cwd(), "tmp/DSLD-csv");
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readCSV(filename: string): Record<string, string>[] {
  const filepath = path.join(CSV_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filepath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

async function batchInsert(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = BATCH_SIZE
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      // On conflict, try upsert or skip
      if (error.code === "23505") {
        // Duplicate key — try individual inserts to skip dupes
        for (const row of batch) {
          await supabase.from(table).upsert(row, { onConflict: "dsld_id" });
        }
        inserted += batch.length;
      } else {
        console.error(
          `Error at batch ${Math.floor(i / batchSize)}: ${error.message}`
        );
        console.error("Sample row:", JSON.stringify(batch[0]).slice(0, 200));
        // Continue with next batch
      }
    } else {
      inserted += batch.length;
    }
    if ((i / batchSize) % 50 === 0 && i > 0) {
      console.log(
        `  ${table}: ${inserted.toLocaleString()} / ${rows.length.toLocaleString()}`
      );
    }
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Table importers
// ---------------------------------------------------------------------------

async function importProducts(): Promise<void> {
  console.log("Importing dsld_products...");
  const raw = readCSV("ProductOverview.csv");
  console.log(`  Read ${raw.length.toLocaleString()} rows from CSV`);

  const rows = raw.map((r) => ({
    dsld_id: parseInt(r["DSLD ID"]),
    product_name: r["Product Name"] || null,
    brand_name: r["Brand Name"] || null,
    bar_code: r["Bar Code"] || null,
    net_contents: r["Net Contents"] || null,
    serving_size: r["Serving Size"] || null,
    product_type: r["Product Type [LanguaL]"] || null,
    supplement_form: r["Supplement Form [LanguaL]"] || null,
    date_entered: r["Date Entered into DSLD"] || null,
    market_status: r["Market Status"] || null,
    suggested_use: r["Suggested Use"] || null,
  }));

  const inserted = await batchInsert("dsld_products", rows);
  console.log(`  Done: ${inserted.toLocaleString()} products inserted`);
}

async function importIngredients(): Promise<void> {
  console.log("Importing dsld_ingredients...");
  const raw = readCSV("DietarySupplementFacts.csv");
  console.log(`  Read ${raw.length.toLocaleString()} rows from CSV`);

  const rows = raw.map((r) => ({
    dsld_id: parseInt(r["DSLD ID"]),
    ingredient_name: r["Ingredient"] || null,
    ingredient_category: r["DSLD Ingredient Categories"] || null,
    amount_per_serving: r["Amount Per Serving"] || null,
    amount_unit: r["Amount Per Serving Unit"] || null,
    percent_daily_value: r["% Daily Value per Serving"] || null,
    daily_value_target_group: r["Daily Value Target Group"] || null,
  }));

  const inserted = await batchInsert("dsld_ingredients", rows);
  console.log(`  Done: ${inserted.toLocaleString()} ingredients inserted`);
}

async function importOtherIngredients(): Promise<void> {
  console.log("Importing dsld_other_ingredients...");
  const raw = readCSV("OtherIngredients.csv");
  console.log(`  Read ${raw.length.toLocaleString()} rows from CSV`);

  const rows = raw.map((r) => ({
    dsld_id: parseInt(r["DSLD ID"]),
    other_ingredients: r["Other Ingredients"] || null,
  }));

  const inserted = await batchInsert("dsld_other_ingredients", rows);
  console.log(
    `  Done: ${inserted.toLocaleString()} other ingredient rows inserted`
  );
}

async function importCompanies(): Promise<void> {
  console.log("Importing dsld_companies...");
  const raw = readCSV("CompanyInformation.csv");
  console.log(`  Read ${raw.length.toLocaleString()} rows from CSV`);

  const rows = raw.map((r) => ({
    dsld_id: parseInt(r["DSLD ID"]),
    company_name: r["Company Name"] || null,
    address: r["Address"] || null,
    city: r["City"] || null,
    state: r["State"] || null,
    zip: r["ZIP"] || null,
    country: r["Country"] || null,
    is_manufacturer: r["Manufacturer"]?.toLowerCase() === "yes",
    is_distributor: r["Distributor"]?.toLowerCase() === "yes",
    is_packager: r["Packager"]?.toLowerCase() === "yes",
    is_reseller: r["Reseller"]?.toLowerCase() === "yes",
    is_other: r["Other"]?.toLowerCase() === "yes",
  }));

  const inserted = await batchInsert("dsld_companies", rows);
  console.log(`  Done: ${inserted.toLocaleString()} company rows inserted`);
}

async function importLabelStatements(): Promise<void> {
  console.log("Importing dsld_label_statements...");
  const raw = readCSV("LabelStatements.csv");
  console.log(`  Read ${raw.length.toLocaleString()} rows from CSV`);

  const rows = raw.map((r) => ({
    dsld_id: parseInt(r["DSLD ID"]),
    statement_type: r["Statement Type"] || null,
    statement: r["Statement"] || null,
  }));

  const inserted = await batchInsert("dsld_label_statements", rows);
  console.log(
    `  Done: ${inserted.toLocaleString()} label statement rows inserted`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const productsOnly = args.includes("--products-only");
  const tableArg = args.find((a) => a.startsWith("--table="));
  const table = tableArg?.split("=")[1];

  console.log("=== DSLD Bootstrap ===");
  console.log(`CSV directory: ${CSV_DIR}`);

  const start = Date.now();

  if (table) {
    // Single table mode
    switch (table) {
      case "products":
        await importProducts();
        break;
      case "ingredients":
        await importIngredients();
        break;
      case "other-ingredients":
        await importOtherIngredients();
        break;
      case "companies":
        await importCompanies();
        break;
      case "statements":
        await importLabelStatements();
        break;
      default:
        console.error(
          `Unknown table: ${table}. Options: products, ingredients, other-ingredients, companies, statements`
        );
        process.exit(1);
    }
  } else if (productsOnly) {
    await importProducts();
  } else {
    // Import all — products first (FK parent), then children
    await importProducts();
    await importIngredients();
    await importOtherIngredients();
    await importCompanies();
    await importLabelStatements();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== Complete in ${elapsed}s ===`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
