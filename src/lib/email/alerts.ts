import { adminClient } from "@/lib/supabase/admin";
import { compileAlert } from "./compiler";
import { sendEmail } from "./sender";
import { createCampaign, recordEmailSend, updateCampaignStatus } from "./queries";
import { SITE_URL } from "./constants";

// ---------------------------------------------------------------------------
// Urgent alert types
// ---------------------------------------------------------------------------

export const URGENT_ACTION_TYPES = new Set(["recall", "ban_restriction", "safety_alert"]);

// ---------------------------------------------------------------------------
// Send urgent alerts for a newly enriched item
// ---------------------------------------------------------------------------
// Called after verdict evaluation in the enrichment runner.
// Sends one alert per affected user-product pair.
// Skips if:
//   - Item is not urgent (not recall/ban/safety_alert)
//   - No relevant verdicts exist
//   - Alert already successfully sent for this item (campaign with status=sent exists)
// ---------------------------------------------------------------------------

export async function sendUrgentAlerts(itemId: string): Promise<number> {
  // 1. Check if item is urgent
  const { data: enrichment } = await adminClient
    .from("item_enrichments")
    .select("summary, regulatory_action_type, deadline")
    .eq("item_id", itemId)
    .maybeSingle();

  if (!enrichment?.regulatory_action_type || !URGENT_ACTION_TYPES.has(enrichment.regulatory_action_type)) {
    return 0;
  }

  // 2. Idempotency: skip if we already successfully sent alerts for this item.
  //    We store the bare itemId in html_content for urgent_alert campaigns.
  //    Failed campaigns are excluded so retries work after transient failures.
  const { count: existingCount } = await adminClient
    .from("email_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("campaign_type", "urgent_alert")
    .eq("html_content", itemId)
    .eq("status", "sent");

  if (existingCount && existingCount > 0) {
    return 0;
  }

  // 3. Get item details
  const { data: item } = await adminClient
    .from("regulatory_items")
    .select("id, title, source_url")
    .eq("id", itemId)
    .single();

  if (!item) return 0;

  // 4. Get relevant verdicts with product + user info
  const { data: verdicts } = await adminClient
    .from("product_match_verdicts")
    .select(`
      product_id, user_id,
      subscriber_products!inner(name, product_ingredients(substances(canonical_name)))
    `)
    .eq("item_id", itemId)
    .eq("relevant", true);

  if (!verdicts || verdicts.length === 0) return 0;

  // 5. Get user emails + unsub tokens (only paid/trial users with access_level=monitor)
  const userIds = [...new Set(verdicts.map((v) => v.user_id))];
  const { data: users } = await adminClient
    .from("users")
    .select("id, email, access_level, email_unsubscribe_token")
    .in("id", userIds)
    .eq("access_level", "monitor")
    .eq("email_opted_out", false);

  if (!users || users.length === 0) return 0;

  const userMap = new Map(users.map((u) => [u.id, { email: u.email, token: u.email_unsubscribe_token }]));

  // Filter verdicts to only those with valid recipients
  const sendableVerdicts = verdicts.filter((v) => userMap.has(v.user_id));
  if (sendableVerdicts.length === 0) return 0;

  // 6. Create campaign record (recipient_count reflects actual sendable count)
  const campaignId = await createCampaign({
    campaign_type: "urgent_alert",
    subject_line: `Alert: ${item.title}`,
    html_content: itemId, // bare itemId for dedup — not rendered HTML
    recipient_count: sendableVerdicts.length,
  });

  // 7. Send one alert per user-product pair
  let sent = 0;
  for (const verdict of sendableVerdicts) {
    const { email, token: unsubToken } = userMap.get(verdict.user_id)!;

    const product = verdict.subscriber_products as unknown as {
      name: string;
      product_ingredients: Array<{ substances: { canonical_name: string } | null }>;
    };

    const matchedSubstances = (product.product_ingredients ?? [])
      .map((pi) => pi.substances?.canonical_name)
      .filter((name): name is string => !!name);

    try {
      const { subject, html } = await compileAlert({
        product_name: product.name,
        title: item.title,
        summary: enrichment.summary ?? "",
        action_type: enrichment.regulatory_action_type,
        source_url: item.source_url,
        deadline: enrichment.deadline,
        matched_substances: matchedSubstances,
        app_url: `${SITE_URL}/app/products?product=${verdict.product_id}&item=${itemId}`,
      });

      const unsubUrl = `${SITE_URL}/api/email/unsubscribe?token=${unsubToken}`;
      const result = await sendEmail({
        to: email,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (campaignId) {
        await recordEmailSend({
          campaign_id: campaignId,
          subscriber_id: verdict.user_id,
          provider_message_id: result.messageId,
          status: result.success ? "sent" : "queued",
        });
      }

      if (result.success) {
        sent++;
        console.log(`[alerts] Sent alert to user ${verdict.user_id} for "${product.name}"`);
      } else {
        console.error(`[alerts] Failed for user ${verdict.user_id}:`, result.error);
      }
    } catch (err) {
      console.error(
        `[alerts] Error sending alert for product ${verdict.product_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (campaignId) {
    await updateCampaignStatus(campaignId, sent > 0 ? "sent" : "failed");
  }

  console.log(`[alerts] Item ${itemId}: ${sent}/${sendableVerdicts.length} alerts sent`);
  return sent;
}
