import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Button,
  Preview,
} from "@react-email/components";
import { COLORS, FONTS, SITE_URL, PHYSICAL_ADDRESS, DARK_MODE_CSS } from "../constants";
import type { WeeklyDigestData } from "../queries";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeeklyNewsletterProps {
  data: WeeklyDigestData;
  /** The lead story — longer analysis, written by Clawdbot or Claude. */
  lead_story?: {
    title: string;
    body: string; // 2-4 paragraphs, plain text
    source_url?: string;
    regulation?: string;
  };
  /** A sticky data point for "THE NUMBER" section. */
  the_number?: {
    value: string;
    context: string;
    source_url?: string;
  };
  /** Unsubscribe URL with token. */
  unsubscribe_url: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export default function WeeklyNewsletter({
  data,
  lead_story,
  the_number,
  unsubscribe_url,
}: WeeklyNewsletterProps) {
  const weekOf = formatWeekOf(data.period.end);

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_CSS }} />
      </Head>
      <Preview>
        Week in FDA: {String(data.total_items)} regulatory actions.{" "}
        {lead_story?.title ?? "Here's what matters."}
      </Preview>
      <Body style={bodyStyle} className="body">
        <Container style={containerStyle} className="container">
          {/* Canary top rule */}
          <Section style={topRuleStyle} className="top-rule" />

          {/* Header */}
          <Section style={headerStyle}>
            <Text style={wordmarkStyle} className="text-secondary">POLICY CANARY</Text>
            <Text style={dateStyle} className="text-secondary">Policy Canary Weekly — {weekOf}</Text>
          </Section>

          {/* THIS WEEK AT FDA */}
          <Section style={contentStyle}>
            <Text style={sectionLabelStyle} className="text-secondary">THIS WEEK AT FDA</Text>

            {/* Lead story */}
            {lead_story && (
              <Section style={leadStoryStyle}>
                <Text style={leadTitleStyle} className="text-primary">{lead_story.title}</Text>
                <Text style={leadBodyStyle} className="text-body">{lead_story.body}</Text>
                <Text style={inlineDisclaimerStyle} className="text-tertiary">
                  AI-assisted analysis. Verify with source documents.
                </Text>
                {lead_story.source_url && (
                  <Text style={sourceStyle}>
                    {lead_story.regulation && (
                      <span style={regulationStyle}>{lead_story.regulation}</span>
                    )}
                    {" "}
                    <Link href={lead_story.source_url} style={sourceLinkStyle}>
                      Source →
                    </Link>
                  </Text>
                )}
              </Section>
            )}

            {/* Remaining items as summaries */}
            {data.items.slice(0, 5).map((item, i) => {
              if (i === 0 && lead_story) return null; // lead story covers first item
              return (
                <Section key={i} style={itemStyle}>
                  <Text style={itemTitleStyle} className="text-primary">{item.title}</Text>
                  {item.summary && (
                    <Text style={itemBodyStyle} className="text-body">{truncate(item.summary, 200)}</Text>
                  )}
                  {item.source_url && (
                    <Text style={sourceStyle}>
                      <Link href={item.source_url} style={sourceLinkStyle}>
                        Source →
                      </Link>
                    </Text>
                  )}
                </Section>
              );
            })}
          </Section>

          {/* THE NUMBER */}
          {the_number && (
            <>
              <Hr style={dividerStyle} className="border-light" />
              <Section style={numberSectionStyle}>
                <Text style={sectionLabelStyle} className="text-secondary">THE NUMBER</Text>
                <Text style={numberValueStyle} className="text-primary">{the_number.value}</Text>
                <Text style={numberContextStyle} className="text-body">{the_number.context}</Text>
                {the_number.source_url && (
                  <Text style={sourceStyle}>
                    <Link href={the_number.source_url} style={sourceLinkStyle}>
                      Source
                    </Link>
                  </Text>
                )}
              </Section>
            </>
          )}

          {/* THE BRIDGE — free to paid */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={bridgeSectionStyle} className="bg-bridge">
            <Text style={bridgeTitleStyle}>
              What this means for YOUR products
            </Text>
            <Text style={bridgeBodyStyle} className="text-body">
              {data.bridge.products_with_action_items > 0
                ? `This week, ${String(data.bridge.products_with_action_items)} of ${String(data.bridge.total_monitored_products)} monitored products received specific action items — with deadlines, matched ingredients, and source documents. That's what a Policy Canary briefing looks like: not a list of FDA headlines, but what they mean for your specific products.`
                : `This week, all ${String(data.bridge.total_monitored_products)} monitored products received all-clear confirmations — each one checked against every regulatory action above. That's what a Policy Canary briefing looks like: verified quiet, not assumed quiet.`}
            </Text>
            <Section style={ctaWrapperStyle}>
              <Button
                href={`${SITE_URL}/login?next=trial`}
                style={ctaButtonStyle}
              >
                Start your 14-day trial →
              </Button>
            </Section>
          </Section>

          {/* IN BRIEF */}
          {data.items.length > 5 && (
            <>
              <Hr style={dividerStyle} className="border-light" />
              <Section style={contentStyle}>
                <Text style={sectionLabelStyle} className="text-secondary">IN BRIEF</Text>
                {data.items.slice(5, 12).map((item, i) => (
                  <Text key={i} style={briefItemStyle} className="text-body">
                    • {item.title}
                    {item.source_url && (
                      <>
                        {" "}
                        <Link href={item.source_url} style={briefLinkStyle}>
                          [link]
                        </Link>
                      </>
                    )}
                  </Text>
                ))}
              </Section>
            </>
          )}

          {/* Footer */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={footerStyle} className="footer">
            <Text style={footerDisclaimerStyle} className="text-tertiary">
              Policy Canary Weekly{"\n"}
              AI-generated from public FDA sources. Regulatory intelligence
              for your review, not legal advice. Verify with source documents
              and qualified professionals. Policy Canary is not a law firm.
            </Text>
            <Text style={footerLinksStyle}>
              <Link href={unsubscribe_url} style={footerLinkStyle}>
                Unsubscribe
              </Link>
              {" · "}
              <Link href={`${SITE_URL}/blog`} style={footerLinkStyle}>
                Read more on our blog
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
// Helpers
// ---------------------------------------------------------------------------

function formatWeekOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
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
};

const topRuleStyle: React.CSSProperties = {
  backgroundColor: COLORS.canary,
  height: "3px",
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
  margin: "8px 0 0",
};

const contentStyle: React.CSSProperties = {
  padding: "0 40px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: COLORS.textSecondary,
  margin: "24px 0 16px",
};

const leadStoryStyle: React.CSSProperties = {
  margin: "0 0 24px",
};

const leadTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "20px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const leadBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 12px",
  whiteSpace: "pre-line",
};

const sourceStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "13px",
  color: COLORS.textSecondary,
  margin: "0 0 4px",
};

const regulationStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
};

const sourceLinkStyle: React.CSSProperties = {
  color: COLORS.textSecondary,
  textDecoration: "underline",
};

const itemStyle: React.CSSProperties = {
  margin: "0 0 20px",
};

const itemTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "18px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 6px",
};

const itemBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 6px",
};

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${COLORS.border}`,
  borderBottom: "none",
  margin: "32px 40px",
};

const numberSectionStyle: React.CSSProperties = {
  padding: "0 40px",
  textAlign: "center" as const,
};

const numberValueStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "48px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1",
  margin: "0 0 8px",
};

const numberContextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const bridgeSectionStyle: React.CSSProperties = {
  backgroundColor: COLORS.bridgeBg,
  padding: "24px 40px",
  margin: "0",
};

const bridgeTitleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "18px",
  fontWeight: 600,
  color: COLORS.amber,
  margin: "0 0 8px",
};

const bridgeBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const ctaWrapperStyle: React.CSSProperties = {
  textAlign: "center" as const,
};

const ctaButtonStyle: React.CSSProperties = {
  backgroundColor: COLORS.amber,
  color: "#FFFFFF",
  fontFamily: FONTS.sans,
  fontSize: "14px",
  fontWeight: 600,
  padding: "10px 24px",
  borderRadius: "4px",
  textDecoration: "none",
  display: "inline-block",
};

const briefItemStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "2px 0",
};

const briefLinkStyle: React.CSSProperties = {
  color: COLORS.textSecondary,
  textDecoration: "underline",
  fontSize: "13px",
};

const inlineDisclaimerStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  fontStyle: "italic",
  margin: "0 0 12px",
};

const footerDisclaimerStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  lineHeight: "1.5",
  whiteSpace: "pre-line",
  margin: "0 0 8px",
};

const footerStyle: React.CSSProperties = {
  padding: "0 40px 32px",
};

const footerTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textTertiary,
  whiteSpace: "pre-line",
  margin: "0 0 8px",
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
