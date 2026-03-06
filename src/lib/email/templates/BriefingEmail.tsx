import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from "@react-email/components";
import { COLORS, FONTS, SITE_URL, PHYSICAL_ADDRESS, DARK_MODE_CSS } from "../constants";
import type { BriefingData, BriefingItem } from "../queries";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BriefingEmailProps {
  data: BriefingData;
  /** Claude Sonnet editorial opening (1-2 sentences). */
  editorial_opening?: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export default function BriefingEmail({
  data,
  editorial_opening,
}: BriefingEmailProps) {
  const hasProductItems = data.product_items.length > 0;
  const weekOf = formatWeekOf(data.period.end);
  const productCount = data.products.length;
  const affectedCount = new Set(
    data.product_items.flatMap((i) => i.matched_products.map((p) => p.product_id))
  ).size;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_CSS }} />
      </Head>
      <Preview>
        {hasProductItems
          ? `${affectedCount} of your ${productCount} products affected this week`
          : `All clear — ${data.total_items_reviewed} FDA actions reviewed, none affect your products`}
      </Preview>
      <Body style={bodyStyle} className="body">
        <Container style={containerStyle} className="container">
          {/* Canary top rule */}
          <Section style={topRuleStyle} className="top-rule" />

          {/* Header */}
          <Section style={headerStyle}>
            <Text style={wordmarkStyle} className="text-secondary">POLICY CANARY</Text>
            <Text style={dateStyle} className="text-secondary">Product Intelligence Briefing — {weekOf}</Text>
          </Section>

          {/* BLUF — Bottom Line Up Front */}
          <Section style={blufStyle}>
            {hasProductItems ? (
              <>
                <Text style={blufTextStyle} className="text-primary">
                  {affectedCount === 1
                    ? `${getFirstAffectedProductName(data)} is affected.`
                    : `${affectedCount} of your ${productCount} products are affected this week.`}
                </Text>
                {editorial_opening && (
                  <Text style={editorialStyle} className="text-body">{editorial_opening}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={allClearHeadlineStyle}>All clear.</Text>
                <Text style={allClearBodyStyle} className="text-body">
                  We reviewed {data.total_items_reviewed} FDA actions this week against your{" "}
                  {productCount} monitored products. None affect your products.
                </Text>
              </>
            )}
          </Section>

          {/* ZONE 1: YOUR PRODUCTS */}
          {hasProductItems && (
            <Section>
              <Text style={sectionLabelStyle} className="text-secondary">YOUR PRODUCTS</Text>
              {groupByProduct(data.product_items, data.products).map(
                (group, idx) => (
                  <Section key={group.product.id}>
                    {idx > 0 && <Hr style={dividerStyle} className="border-light" />}
                    <ProductSection
                      product={group.product}
                      items={group.items}
                    />
                  </Section>
                )
              )}
            </Section>
          )}

          {/* All-clear product list (when no items) */}
          {!hasProductItems && (
            <Section style={clearListStyle}>
              <Text style={clearListHeaderStyle} className="text-secondary">Your monitored products:</Text>
              {data.products.map((p) => (
                <Text key={p.id} style={clearProductStyle} className="text-secondary">
                  {p.name} — clear
                </Text>
              ))}
            </Section>
          )}

          <Hr style={dividerStyle} className="border-light" />

          {/* ZONE 2: YOUR INDUSTRY */}
          {data.industry_items.length > 0 && (
            <Section>
              <Text style={sectionLabelStyle} className="text-secondary">YOUR INDUSTRY</Text>
              {data.industry_items.map((item) => (
                <Section key={item.item_id} style={industryItemStyle}>
                  <Text style={industryTitleStyle} className="text-primary">{item.title}</Text>
                  {item.summary && (
                    <Text style={industryBodyStyle} className="text-body">{truncate(item.summary, 200)}</Text>
                  )}
                  {item.source_url && (
                    <Text style={sourceStyle}>
                      <Link href={item.source_url} style={sourceLinkStyle}>
                        Source →
                      </Link>
                    </Text>
                  )}
                </Section>
              ))}
              <Hr style={dividerStyle} className="border-light" />
            </Section>
          )}

          {/* ZONE 3: ACROSS FDA */}
          {data.other_items.length > 0 && (
            <Section>
              <Text style={sectionLabelStyle} className="text-secondary">ACROSS FDA THIS WEEK</Text>
              {data.other_items.map((item, i) => (
                <Text key={i} style={otherItemTitleStyle} className="text-primary">
                  {stripHtml(item.title)}
                  {item.source_url && (
                    <>
                      {" "}
                      <Link href={item.source_url} style={sourceLinkStyle}>
                        Source →
                      </Link>
                    </>
                  )}
                </Text>
              ))}
            </Section>
          )}

          {/* Share CTA */}
          <Section style={shareSectionStyle}>
            <Text style={shareTextStyle}>
              <Link href={`${SITE_URL}/app/feed`} style={shareLinkStyle}>
                View full regulatory feed in the web app →
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={footerStyle} className="footer">
            <Text style={footerDisclaimerStyle} className="text-tertiary">
              Policy Canary | Product Intelligence Briefing{"\n"}
              AI-generated from public FDA sources. Regulatory intelligence
              for your review, not legal advice. Verify with source documents
              and qualified professionals. Policy Canary is not a law firm.
            </Text>
            <Text style={footerLinksStyle}>
              <Link href={`${SITE_URL}/app/products`} style={footerLinkStyle}>
                Manage your products
              </Link>
            </Text>
            <Text style={footerAddressStyle} className="text-tertiary">{PHYSICAL_ADDRESS}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Product Section (per-product block within Zone 1)
// ---------------------------------------------------------------------------

function ProductSection({
  product,
  items,
}: {
  product: { id: string; name: string };
  items: BriefingItem[];
}) {
  return (
    <Section style={productSectionStyle}>
      <Text style={productNameStyle} className="text-primary">{product.name}</Text>

      {items.map((item) => (
        <Section key={item.item_id} style={itemBlockStyle}>
          {/* Status + confidence badges */}
          <Section style={badgeRowStyle}>
            <StatusBadge actionType={item.regulatory_action_type} />
            <ConfidenceBadge
              actionType={item.regulatory_action_type}
              deadline={item.deadline}
            />
          </Section>

          {/* Summary */}
          {item.summary && <Text style={itemBodyStyle} className="text-body">{item.summary}</Text>}

          {/* Action items */}
          {item.action_items && item.action_items.length > 0 && (
            <Section style={actionBlockStyle} className="action-block">
              <Text style={actionBlockHeaderStyle} className="text-secondary">ITEMS TO CONSIDER</Text>
              {item.action_items.map((ai, idx) => (
                <Text key={idx} style={actionItemStyle} className="text-body">
                  {idx + 1}. {ai}
                </Text>
              ))}
              {item.deadline && (
                <Text style={deadlineStyle}>
                  Deadline: {formatDate(item.deadline)}
                </Text>
              )}
            </Section>
          )}

          {/* Source citation */}
          {item.source_url && (
            <Text style={sourceStyle}>
              {item.regulations_cited?.[0] && (
                <span style={regulationStyle}>{item.regulations_cited[0]}</span>
              )}
              {" "}
              <Link href={item.source_url} style={sourceLinkStyle}>
                View source document →
              </Link>
            </Text>
          )}
        </Section>
      ))}

      {/* Single AI disclaimer per product section */}
      <Text style={inlineDisclaimerStyle} className="text-tertiary">
        AI-generated analysis. Verify with source documents.
      </Text>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Badge components
// ---------------------------------------------------------------------------

function StatusBadge({ actionType }: { actionType: string | null }) {
  const config = getStatusConfig(actionType);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: FONTS.sans,
        backgroundColor: config.bg,
        color: config.color,
        marginRight: "6px",
      }}
    >
      {config.label}
    </span>
  );
}

function ConfidenceBadge({
  actionType,
  deadline,
}: {
  actionType: string | null;
  deadline: string | null;
}) {
  const label = getConfidenceLabel(actionType, deadline);
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: FONTS.sans,
        backgroundColor: COLORS.badgeInfoBg,
        color: COLORS.textSecondary,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusConfig(actionType: string | null) {
  switch (actionType) {
    case "recall":
    case "ban_restriction":
    case "safety_alert":
      return { label: "Urgent", bg: COLORS.badgeUrgentBg, color: COLORS.urgentRed };
    case "proposed_rule":
    case "guidance":
      return { label: "Watch", bg: COLORS.badgeWatchBg, color: COLORS.amber };
    default:
      return { label: "Review", bg: COLORS.badgeInfoBg, color: COLORS.textSecondary };
  }
}

function getConfidenceLabel(actionType: string | null, deadline: string | null) {
  if (actionType === "recall") return "Confirmed Recall";
  if (actionType === "ban_restriction") return "Rule Final";
  if (actionType === "proposed_rule") return deadline ? `Comment closes ${formatDate(deadline)}` : "Proposed Rule";
  if (actionType === "guidance") return "Guidance Pending";
  return null;
}

function groupByProduct(
  items: BriefingItem[],
  products: Array<{ id: string; name: string }>
) {
  const map = new Map<string, { product: { id: string; name: string }; items: BriefingItem[] }>();

  for (const product of products) {
    map.set(product.id, { product, items: [] });
  }

  for (const item of items) {
    for (const mp of item.matched_products) {
      const group = map.get(mp.product_id);
      if (group && !group.items.some((i) => i.item_id === item.item_id)) {
        group.items.push(item);
      }
    }
  }

  // Return only products with items, sorted by number of items desc
  return [...map.values()]
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
}

function getFirstAffectedProductName(data: BriefingData): string {
  const firstItem = data.product_items[0];
  return firstItem?.matched_products[0]?.product_name ?? "Your product";
}

function formatWeekOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const bodyStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgLight,
  fontFamily: FONTS.sans,
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgWhite,
  maxWidth: "600px",
  margin: "0 auto",
  padding: 0,
};

const topRuleStyle: React.CSSProperties = {
  backgroundColor: COLORS.canary,
  height: "3px",
  margin: 0,
  padding: 0,
};

const headerStyle: React.CSSProperties = {
  padding: "32px 40px 0",
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "2px",
  color: COLORS.textSecondary,
  margin: 0,
};

const dateStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textSecondary,
  margin: "4px 0 0",
};

const blufStyle: React.CSSProperties = {
  padding: "24px 40px",
};

const blufTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "18px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: 0,
};

const editorialStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "12px 0 0",
};

const allClearHeadlineStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "22px",
  fontWeight: 700,
  color: COLORS.confirmedGreen,
  margin: 0,
};

const allClearBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "8px 0 0",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: COLORS.textSecondary,
  padding: "0 40px",
  margin: "24px 0 16px",
};

const productSectionStyle: React.CSSProperties = {
  padding: "0 40px",
};

const productNameStyle: React.CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "22px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const itemBlockStyle: React.CSSProperties = {
  margin: "0 0 24px",
};

const badgeRowStyle: React.CSSProperties = {
  margin: "0 0 12px",
};

const itemBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 12px",
};

const inlineDisclaimerStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  fontStyle: "italic",
  margin: "0 0 12px",
};

const actionBlockStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgLight,
  borderLeft: `4px solid ${COLORS.amber}`,
  padding: "16px 20px",
  margin: "0 0 12px",
};

const actionBlockHeaderStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: COLORS.textSecondary,
  margin: "0 0 8px",
};

const actionItemStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.6",
  margin: "0 0 6px",
};

const deadlineStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  fontWeight: 700,
  color: COLORS.amber,
  margin: "8px 0 0",
};

const sourceStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "13px",
  color: COLORS.textSecondary,
  margin: "0 0 4px",
};

const regulationStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  color: COLORS.textSecondary,
};

const sourceLinkStyle: React.CSSProperties = {
  color: COLORS.textSecondary,
  textDecoration: "underline",
};

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${COLORS.border}`,
  borderBottom: "none",
  marginTop: "32px",
  marginBottom: "32px",
  marginLeft: "40px",
  marginRight: "40px",
  width: "auto",
};

const clearListStyle: React.CSSProperties = {
  padding: "0 40px 16px",
};

const clearListHeaderStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  fontWeight: 600,
  color: COLORS.textSecondary,
  margin: "0 0 8px",
};

const clearProductStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.textSecondary,
  margin: "2px 0",
};

const industryItemStyle: React.CSSProperties = {
  padding: "0 40px 16px",
};

const industryTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 4px",
};

const industryBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 4px",
};

const otherItemTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.textBody,
  lineHeight: "1.4",
  padding: "0 40px",
  margin: "0 0 12px",
};

const shareSectionStyle: React.CSSProperties = {
  padding: "16px 40px",
  textAlign: "center" as const,
};

const shareTextStyle: React.CSSProperties = {
  margin: 0,
};

const shareLinkStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.amber,
  textDecoration: "underline",
};

const footerStyle: React.CSSProperties = {
  padding: "0 40px 32px",
};

const footerDisclaimerStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  lineHeight: "1.5",
  whiteSpace: "pre-line",
  margin: "0 0 12px",
};

const footerLinksStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textTertiary,
  margin: "0 0 8px",
};

const footerLinkStyle: React.CSSProperties = {
  color: COLORS.textTertiary,
  textDecoration: "underline",
};

const footerAddressStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  margin: 0,
};
