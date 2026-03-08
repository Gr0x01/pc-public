#!/usr/bin/env npx tsx
/**
 * Build consultant review packet — sample output for FDA practitioner accuracy review.
 * Embeds the actual email HTML (with clickable source links) instead of screenshots.
 *
 * Usage: npx tsx scripts/build-consultant-pdf.ts
 * Output: scripts/demo-output/consultant-review-packet.html (open in browser)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = join(__dirname, "demo-output");

function readFile(filename: string): string {
  const filepath = join(OUTPUT_DIR, filename);
  if (!existsSync(filepath)) {
    console.error(`[pdf] Missing file: ${filepath}`);
    return "";
  }
  return readFileSync(filepath, "utf-8");
}

// Extract the <body> content from the email HTML (strip doctype, html, head, outer body tags)
function extractEmailBody(html: string): string {
  // Get everything inside the outer <body> tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return html;
  let body = bodyMatch[1];

  // The emails have inline styles, so they'll render fine embedded.
  // Extract the <style> block too so dark mode media queries come along
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const style = styleMatch ? `<style>${styleMatch[1]}</style>` : "";

  return style + body;
}

const briefingHtml = readFile("briefing.html");
const alertHtml = readFile("alert.html");

const briefingBody = extractEmailBody(briefingHtml);
const alertBody = extractEmailBody(alertHtml);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Policy Canary — Sample Output for Review</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0F172A;
      line-height: 1.6;
      background: #fff;
    }

    @media print {
      .page { padding: 0.5in; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      @page { margin: 0.5in; size: letter; }
    }

    .page {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }

    /* Cover */
    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: calc(100vh - 1.5in);
      padding: 2in 0;
    }

    .cover-rule {
      width: 60px;
      height: 4px;
      background: #EAC100;
      margin-bottom: 24px;
    }

    .cover h1 {
      font-family: 'IBM Plex Serif', Georgia, serif;
      font-size: 28pt;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.15;
      margin-bottom: 16px;
    }

    .cover .subtitle {
      font-size: 12pt;
      color: #64748B;
      margin-bottom: 48px;
      max-width: 480px;
    }

    .cover .meta {
      font-size: 9pt;
      color: #94A3B8;
      line-height: 1.8;
    }

    .cover .meta strong {
      color: #64748B;
    }

    /* Section headers — scoped to .page to avoid bleeding into embedded emails */
    .page > h2 {
      font-family: 'IBM Plex Serif', Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 8px;
    }

    .page > .section-intro {
      font-size: 10pt;
      color: #64748B;
      margin-bottom: 24px;
    }

    .page > h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #0F172A;
      margin: 24px 0 8px;
    }

    .page > p, .page > ul > li {
      font-size: 9pt;
      color: #334155;
      line-height: 1.6;
    }

    .page > ul {
      padding-left: 20px;
      margin-bottom: 16px;
    }

    .page > ul > li { margin-bottom: 6px; }

    /* Context page tables */
    .context-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
    }

    .context-table th {
      text-align: left;
      padding: 6px 10px;
      background: #F1F5F9;
      color: #64748B;
      font-weight: 600;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E2E8F0;
    }

    .context-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #F1F5F9;
      color: #334155;
    }

    /* Email embed container */
    .email-embed {
      margin: 24px 0;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .email-embed-label {
      background: #F1F5F9;
      padding: 8px 16px;
      font-size: 8pt;
      font-weight: 600;
      color: #64748B;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-bottom: 1px solid #E2E8F0;
    }

    .email-embed-content {
      background: #F8FAFC;
      padding: 24px;
    }

    /* Question boxes */
    .question {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 12px 0;
    }

    .question .q-num {
      font-weight: 700;
      color: #D97706;
      margin-right: 6px;
    }

    .question p {
      margin: 0;
      font-size: 9pt;
      color: #334155;
    }

    .question .context {
      font-size: 8.5pt;
      color: #64748B;
      margin-top: 6px;
    }

    /* Separator */
    hr {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 32px 0;
    }

    .footer-note {
      font-size: 9pt;
      color: #94A3B8;
      text-align: center;
      margin-top: 48px;
    }
  </style>
</head>
<body>

<!-- ================================================================ -->
<!-- COVER PAGE                                                       -->
<!-- ================================================================ -->
<div class="page">
  <div class="cover">
    <div class="cover-rule"></div>
    <h1>Sample Output for Review</h1>
    <p class="subtitle">We're building a tool that monitors FDA regulatory activity and maps it to a company's specific products. Below is sample output generated from real FDA data. We'd like your expert assessment of whether the analysis is accurate.</p>
    <div class="meta">
      <strong>Prepared by:</strong> Rashaad Baten, Policy Canary<br>
      <strong>Date:</strong> March 2026<br>
      <strong>Contact:</strong> rashaad@policycanary.io
    </div>
  </div>
</div>

<!-- ================================================================ -->
<!-- CONTEXT                                                          -->
<!-- ================================================================ -->
<div class="page page-break">
  <h2>Context</h2>
  <p class="section-intro">What you're looking at and where the data comes from.</p>

  <h3>What This Is</h3>
  <p>Policy Canary ingests public FDA data, uses AI to identify which regulatory changes affect which products, and generates analysis with action items. The two outputs below are what a subscriber would receive: a weekly briefing and an urgent alert.</p>
  <p style="margin-top: 8px;">Everything is AI-generated from public FDA sources. Every item includes a link to the original source document so you can verify the analysis against the primary source.</p>

  <h3>Data Sources</h3>
  <table class="context-table">
    <tr><th>Source</th><th>What It Provides</th></tr>
    <tr><td>Federal Register API</td><td>Rules, proposed rules, notices</td></tr>
    <tr><td>openFDA API</td><td>Enforcement actions, recalls</td></tr>
    <tr><td>FDA RSS Feeds</td><td>Recalls, safety alerts, press releases</td></tr>
    <tr><td>FDA Warning Letters</td><td>~3,300 letters across all FDA centers</td></tr>
  </table>

  <h3>Demo Product Portfolio</h3>
  <p>The sample output was generated for a test portfolio of 4 products across 3 sectors:</p>
  <table class="context-table">
    <tr><th>Product</th><th>Brand</th><th>Type</th></tr>
    <tr><td>Miss Vickie's Spicy Dill Pickle Kettle Cooked Potato Chips</td><td>Frito-Lay</td><td>Food</td></tr>
    <tr><td>Ultra Repair Cream Coconut Vanilla</td><td>First Aid Beauty</td><td>Cosmetic</td></tr>
    <tr><td>Bum Isolate Protein</td><td>RAW</td><td>Supplement</td></tr>
    <tr><td>OxyElite Pro</td><td>USPlabs</td><td>Supplement</td></tr>
  </table>
</div>

<!-- ================================================================ -->
<!-- WEEKLY BRIEFING                                                  -->
<!-- ================================================================ -->
<div class="page page-break">
  <h2>Weekly Briefing</h2>
  <p class="section-intro">The core product: a weekly email customized to the subscriber's products. Organized in three zones — items that directly affect their products, items in their industry, and everything else across FDA. Source links are clickable.</p>

  <div class="email-embed">
    <div class="email-embed-label">Product Intelligence Briefing — generated from real FDA data</div>
    <div class="email-embed-content">
      ${briefingBody}
    </div>
  </div>
</div>

<!-- ================================================================ -->
<!-- ALERT EMAIL                                                      -->
<!-- ================================================================ -->
<div class="page page-break">
  <h2>Urgent Alert</h2>
  <p class="section-intro">Event-driven alert sent when something urgent directly affects a subscriber's product. This example was triggered by a real Frito-Lay voluntary recall (undeclared milk in Miss Vickie's Spicy Dill Pickle Potato Chips, March 2026).</p>

  <div class="email-embed">
    <div class="email-embed-label">Regulatory Alert — real product recall</div>
    <div class="email-embed-content">
      ${alertBody}
    </div>
  </div>
</div>

<!-- ================================================================ -->
<!-- WHAT WE WANT TO KNOW                                             -->
<!-- ================================================================ -->
<div class="page page-break">
  <h2>What We'd Like to Know</h2>
  <p class="section-intro">We're looking for a practitioner's honest read on the output above.</p>

  <div class="question no-break">
    <p><span class="q-num">1.</span> <strong>Is the analysis accurate?</strong></p>
    <p class="context">Are the regulatory items correctly matched to the products? Are the summaries factually right? Is anything misleading or wrong?</p>
  </div>

  <div class="question no-break">
    <p><span class="q-num">2.</span> <strong>Are we flagging the right things as urgent?</strong></p>
    <p class="context">Items are tagged Urgent, Watch, or Review. Does our urgency calibration match how you'd prioritize these for a client?</p>
  </div>

  <div class="question no-break">
    <p><span class="q-num">3.</span> <strong>What would a practitioner catch immediately that we're getting wrong?</strong></p>
    <p class="context">Anything that jumps out — missed context, wrong framing, action items that don't make sense, regulatory nuance we're flattening. We want the unfiltered read.</p>
  </div>

  <hr>

  <p style="color: #64748B; font-size: 9pt; margin-top: 16px;">Any additional observations are welcome. We're trying to get this right before putting it in front of anyone.</p>

  <p class="footer-note">Policy Canary | rashaad@policycanary.io</p>
</div>

</body>
</html>`;

const outputPath = join(OUTPUT_DIR, "consultant-review-packet.html");
writeFileSync(outputPath, html);
console.log(`[build] Wrote HTML: ${outputPath}`);

// Generate PDF with Playwright (links remain clickable in PDF)
import("playwright").then(async ({ chromium }) => {
  const pdfPath = join(OUTPUT_DIR, "consultant-review-packet.pdf");
  console.log("[build] Generating PDF...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${outputPath}`, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
  });
  await browser.close();
  console.log(`[build] Wrote PDF: ${pdfPath}`);
}).catch(() => {
  console.log("[build] PDF generation failed — open the HTML in browser and print to PDF");
  console.log(`[build] open ${outputPath}`);
});
