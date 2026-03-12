import { getPagesForRSS } from "@/lib/intelligence/queries";
import { PAGE_TYPE_ROUTES, PAGE_TYPE_LABELS } from "@/lib/intelligence/types";

export const revalidate = 3600;

const SITE_URL = "https://policycanary.io";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const pages = await getPagesForRSS();

  const items = pages
    .filter((p) => p.published_at != null)
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/${PAGE_TYPE_ROUTES[p.page_type]}/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/${PAGE_TYPE_ROUTES[p.page_type]}/${p.slug}</guid>
      <description>${escapeXml(p.excerpt)}</description>
      <category>${escapeXml(PAGE_TYPE_LABELS[p.page_type])}</category>
      <pubDate>${new Date(p.published_at!).toUTCString()}</pubDate>${
        p.cover_image_url
          ? `\n      <enclosure url="${escapeXml(p.cover_image_url)}" type="image/webp" length="0" />`
          : ""
      }
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Policy Canary Intelligence</title>
    <link>${SITE_URL}</link>
    <description>FDA regulatory intelligence — ingredient safety, enforcement actions, and regulation analysis.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/intelligence/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
