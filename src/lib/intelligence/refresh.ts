/**
 * Intelligence page refresh flagging.
 *
 * After enriching a regulatory item, check if any intelligence pages
 * should be flagged for refresh based on matching substances, companies,
 * or regulation tags.
 */

import { adminClient } from "@/lib/supabase/admin";

/**
 * Flag published intelligence pages for refresh when a new item matches.
 * Non-fatal — caller should catch errors.
 */
export async function flagIntelligencePagesForRefresh(
  itemId: string
): Promise<number> {
  let flagged = 0;

  // 1. Get item details for matching
  const { data: item } = await adminClient
    .from("regulatory_items")
    .select("id, enforcement_company_name")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) return 0;

  // 2. Get substance IDs linked to this item
  const { data: itemSubstances } = await adminClient
    .from("regulatory_item_substances")
    .select("substance_id")
    .eq("item_id", itemId);

  const substanceIds = (itemSubstances ?? []).map((s) => s.substance_id);

  // 3. Get enrichment tags for regulation matching
  const { data: tags } = await adminClient
    .from("item_enrichment_tags")
    .select("tag_dimension, tag_value")
    .eq("item_id", itemId);

  // 4. Match ingredient pages by substance_id in structured_data
  if (substanceIds.length > 0) {
    for (const substanceId of substanceIds) {
      const { data: pages } = await adminClient
        .from("intelligence_pages")
        .select("id")
        .eq("page_type", "ingredient")
        .eq("status", "published")
        .contains("structured_data", { substance_id: substanceId });

      for (const page of pages ?? []) {
        await markForRefresh(page.id, `new_item:${itemId}`);
        flagged++;
      }
    }
  }

  // 5. Match enforcement pages by company name
  if (item.enforcement_company_name) {
    const companySlug = item.enforcement_company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: pages } = await adminClient
      .from("intelligence_pages")
      .select("id")
      .eq("page_type", "enforcement")
      .eq("status", "published")
      .eq("slug", companySlug);

    for (const page of pages ?? []) {
      await markForRefresh(page.id, `new_item:${itemId}`);
      flagged++;
    }
  }

  // 6. Match regulation pages by tag values
  const regulationTags = (tags ?? []).filter(
    (t) => t.tag_dimension === "regulation" || t.tag_dimension === "cfr_reference"
  );

  for (const tag of regulationTags) {
    const tagSlug = tag.tag_value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: pages } = await adminClient
      .from("intelligence_pages")
      .select("id")
      .eq("page_type", "regulation")
      .eq("status", "published")
      .eq("slug", tagSlug);

    for (const page of pages ?? []) {
      await markForRefresh(page.id, `new_item:${itemId}`);
      flagged++;
    }
  }

  if (flagged > 0) {
    console.log(`  Flagged ${flagged} intelligence page(s) for refresh`);
  }

  return flagged;
}

async function markForRefresh(pageId: string, reason: string) {
  await adminClient
    .from("intelligence_pages")
    .update({
      status: "needs_refresh",
      refresh_reason: reason,
    })
    .eq("id", pageId);
}
