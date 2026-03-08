/**
 * test-content-fetch.ts
 *
 * Quick debugging aid — fetches a single FDA URL and prints extracted text.
 *
 * Usage:
 *   npx tsx scripts/test-content-fetch.ts <url>
 *   npx tsx scripts/test-content-fetch.ts https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/...
 */

import { fetchSourceContent } from "../src/pipeline/enrichment/content-fetch";

const url = process.argv[2];

if (!url) {
  console.error("Usage: npx tsx scripts/test-content-fetch.ts <fda-url>");
  process.exit(1);
}

async function main() {
  console.log(`Fetching: ${url}\n`);

  const { content, error } = await fetchSourceContent(url);

  if (error) {
    console.error(`Error: ${error}`);
  }

  if (content) {
    console.log(`Extracted ${content.length} chars:\n`);
    console.log(content.slice(0, 2000));
    if (content.length > 2000) {
      console.log(`\n... (${content.length - 2000} more chars)`);
    }
  } else {
    console.log("No content extracted.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
