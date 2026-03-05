/**
 * SEO keyword research v2 — bulk volume + difficulty for curated keywords
 * Usage: npx tsx scripts/seo-research-v2.ts
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const AUTH = process.env.DATAFORSEO_BASE64!;
const BASE = 'https://api.dataforseo.com/v3';

async function api(endpoint: string, body: unknown[]) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Curated keyword list — things our actual buyers would search
const KEYWORDS = [
  // Regulatory monitoring (our direct space)
  'FDA regulatory monitoring',
  'FDA compliance monitoring',
  'FDA regulatory intelligence',
  'FDA regulatory alerts',
  'FDA regulation tracking',
  'how to monitor FDA regulations',
  'FDA regulatory monitoring software',
  'FDA compliance monitoring tool',
  'FDA regulatory updates',
  'FDA regulatory changes',
  'FDA regulation updates',
  'FDA new regulations 2026',

  // MoCRA / Cosmetics compliance
  'MoCRA compliance',
  'MoCRA requirements',
  'MoCRA deadline',
  'MoCRA registration',
  'MoCRA FDA',
  'cosmetic registration FDA',
  'FDA cosmetic facility registration',
  'cosmetic GMP requirements',
  'MoCRA compliance checklist',
  'FDA cosmetic regulations 2026',
  'cosmetic product listing FDA',

  // Supplement compliance
  'dietary supplement FDA compliance',
  'supplement CGMP requirements',
  'FDA supplement regulations',
  'dietary supplement labeling requirements',
  'supplement company FDA requirements',
  'FDA warning letter supplement company',
  'supplement GMP compliance',
  'dietary supplement manufacturing requirements',
  'FDA DSHEA requirements',
  'supplement adverse event reporting',

  // Food safety / compliance
  'FDA food safety regulations',
  'food manufacturer FDA compliance',
  'FSMA compliance requirements',
  'food labeling FDA requirements',
  'FDA food additive regulations',
  'food recall FDA',
  'FDA warning letter food company',
  'GRAS determination FDA',
  'food safety modernization act requirements',

  // Specific ingredient/ban searches (high intent)
  'FDA BHA ban',
  'FDA red dye 3 ban',
  'FDA red 40 ban',
  'FDA titanium dioxide ban',
  'FDA food dye ban 2026',
  'FDA food additive ban list',
  'FDA banned ingredients',
  'GRAS revocation',
  'FDA food chemical safety',

  // Warning letters & enforcement
  'FDA warning letter',
  'FDA warning letter search',
  'FDA warning letter database',
  'FDA enforcement actions',
  'FDA 483 observations',
  'FDA inspection results',
  'FDA recall list',
  'FDA compliance history',

  // Small business / cost-conscious
  'FDA compliance for small business',
  'FDA compliance cost',
  'affordable FDA compliance',
  'FDA regulatory consultant',
  'FDA compliance consultant cost',
  'FDA compliance help',

  // Product-specific
  'supplement product monitoring',
  'cosmetic product compliance',
  'food product regulatory compliance',
  'product recall monitoring',
  'ingredient compliance monitoring',
  'regulatory risk monitoring',
];

async function main() {
  console.log(`DataForSEO Keyword Research v2 — Policy Canary`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Get search volume for all keywords via Google Ads endpoint
  console.log(`Getting search volume for ${KEYWORDS.length} keywords...\n`);

  const volumeData = await api('/keywords_data/google_ads/search_volume/live', [{
    keywords: KEYWORDS,
    location_code: 2840,
    language_code: 'en',
  }]);

  const volumeResults = volumeData?.tasks?.[0]?.result || [];
  const volumeMap = new Map<string, { volume: number; cpc: number; competition: number }>();
  for (const item of volumeResults) {
    if (item.keyword) {
      volumeMap.set(item.keyword, {
        volume: item.search_volume ?? 0,
        cpc: item.cpc ?? 0,
        competition: item.competition ?? 0,
      });
    }
  }

  console.log(`Got volume data for ${volumeMap.size} keywords\n`);

  // Step 2: Get keyword difficulty
  const kwWithVolume = KEYWORDS.filter(k => (volumeMap.get(k)?.volume ?? 0) > 0);
  console.log(`Getting difficulty for ${kwWithVolume.length} keywords with volume...\n`);

  const diffData = await api('/dataforseo_labs/google/bulk_keyword_difficulty/live', [{
    keywords: kwWithVolume,
    location_code: 2840,
    language_code: 'en',
  }]);

  const diffMap = new Map<string, number>();
  const diffResults = diffData?.tasks?.[0]?.result || [];
  for (const item of diffResults) {
    if (item.keyword && item.keyword_difficulty != null) {
      diffMap.set(item.keyword, item.keyword_difficulty);
    }
  }

  console.log(`Got difficulty for ${diffMap.size} keywords\n`);

  // Step 3: Combine and rank
  type Row = {
    keyword: string;
    volume: number;
    difficulty: number | null;
    cpc: number;
    competition: number;
    score: number;
  };

  const rows: Row[] = KEYWORDS.map(k => {
    const v = volumeMap.get(k) ?? { volume: 0, cpc: 0, competition: 0 };
    const diff = diffMap.get(k) ?? null;
    const score = v.volume > 0
      ? v.volume * ((100 - (diff ?? 50)) / 100) * (1 + v.cpc)
      : 0;
    return {
      keyword: k,
      volume: v.volume,
      difficulty: diff,
      cpc: v.cpc,
      competition: v.competition,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  // Output
  const withVolume = rows.filter(r => r.volume > 0);

  console.log(`${'='.repeat(110)}`);
  console.log('ALL KEYWORDS WITH VOLUME (sorted by opportunity score)');
  console.log(`${'='.repeat(110)}\n`);

  console.log(
    'Keyword'.padEnd(52) +
    'Vol'.padStart(8) +
    'Diff'.padStart(7) +
    'CPC'.padStart(8) +
    'Comp'.padStart(7) +
    'Score'.padStart(10)
  );
  console.log('-'.repeat(92));

  for (const r of withVolume) {
    console.log(
      r.keyword.slice(0, 51).padEnd(52) +
      String(r.volume).padStart(8) +
      (r.difficulty != null ? String(r.difficulty) : '?').padStart(7) +
      `$${r.cpc.toFixed(2)}`.padStart(8) +
      String(r.competition ?? '?').padStart(7) +
      Math.round(r.score).toString().padStart(10)
    );
  }

  // Low difficulty
  const lowDiff = withVolume.filter(r => r.difficulty != null && r.difficulty <= 40);
  if (lowDiff.length > 0) {
    console.log(`\n${'='.repeat(110)}`);
    console.log('EASIEST TO RANK (difficulty <= 40)');
    console.log(`${'='.repeat(110)}\n`);
    for (const r of lowDiff.sort((a, b) => a.difficulty! - b.difficulty!)) {
      console.log(
        r.keyword.slice(0, 51).padEnd(52) +
        String(r.volume).padStart(8) +
        String(r.difficulty).padStart(7) +
        `$${r.cpc.toFixed(2)}`.padStart(8)
      );
    }
  }

  // Zero volume (nobody searches these)
  const zeroVol = rows.filter(r => r.volume === 0);
  if (zeroVol.length > 0) {
    console.log(`\n${'='.repeat(110)}`);
    console.log(`ZERO SEARCH VOLUME (${zeroVol.length} keywords — skip these)`);
    console.log(`${'='.repeat(110)}\n`);
    for (const r of zeroVol) {
      console.log(`  ${r.keyword}`);
    }
  }

  console.log(`\n\nSummary:`);
  console.log(`  Total keywords checked: ${KEYWORDS.length}`);
  console.log(`  With search volume: ${withVolume.length}`);
  console.log(`  Zero volume: ${zeroVol.length}`);
  console.log(`  Low difficulty (<=40): ${lowDiff.length}`);
  console.log(`  High CPC (>=$3): ${withVolume.filter(r => r.cpc >= 3).length}`);
}

main().catch(console.error);
