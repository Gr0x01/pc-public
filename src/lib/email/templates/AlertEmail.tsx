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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AlertEmailProps {
  /** The affected product name. */
  product_name: string;
  /** The regulatory item title. */
  title: string;
  /** Short summary of the regulatory action. */
  summary: string;
  /** Type of regulatory action (recall, safety_alert, ban_restriction, etc). */
  action_type: string | null;
  /** Link to the source document. */
  source_url: string | null;
  /** Deadline for response, if any. */
  deadline: string | null;
  /** Specific substances/ingredients that triggered the match. */
  matched_substances: string[];
  /** Link to the item in the web app. */
  app_url: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export default function AlertEmail({
  product_name,
  title,
  summary,
  action_type,
  source_url,
  deadline,
  matched_substances,
  app_url,
}: AlertEmailProps) {
  const actionLabel = getActionLabel(action_type);

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_CSS }} />
      </Head>
      <Preview>
        {product_name} | {actionLabel}: {truncate(title, 60)}
      </Preview>
      <Body style={bodyStyle} className="body">
        <Container style={containerStyle} className="container">
          {/* Urgent red top rule (not canary — signals alert) */}
          <Section style={topRuleStyle} className="top-rule-alert" />

          {/* Header */}
          <Section style={headerStyle}>
            <Text style={wordmarkStyle} className="text-secondary">POLICY CANARY</Text>
            <Text style={alertLabelStyle}>Regulatory Alert</Text>
          </Section>

          {/* BLUF */}
          <Section style={blufStyle}>
            <Text style={blufTextStyle} className="text-primary">
              {actionLabel} affecting {product_name}
            </Text>
            <Text style={confidenceBadgeStyle} className="badge-info">
              {getConfidenceLabel(action_type)}
            </Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Text style={titleStyle} className="text-primary">{title}</Text>
            <Text style={summaryStyle} className="text-body">{summary}</Text>

            {/* Matched substances */}
            {matched_substances.length > 0 && (
              <Text style={substanceStyle} className="text-secondary">
                Matched ingredients: {matched_substances.join(", ")}
              </Text>
            )}

            {/* Deadline */}
            {deadline && (
              <Section style={deadlineBlockStyle} className="action-block">
                <Text style={deadlineStyle}>
                  Deadline: {formatDate(deadline)}
                </Text>
              </Section>
            )}

            {/* Inline disclaimer */}
            <Text style={inlineDisclaimerStyle} className="text-tertiary">
              AI-generated analysis. Verify with source documents.
            </Text>

            {/* Source */}
            {source_url && (
              <Text style={sourceStyle}>
                <Link href={source_url} style={sourceLinkStyle}>
                  View source document →
                </Link>
              </Text>
            )}

            {/* Web app link */}
            <Text style={appLinkStyle}>
              <Link href={app_url} style={appLinkAnchorStyle}>
                View full details in Policy Canary →
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={footerStyle} className="footer">
            <Text style={footerDisclaimerStyle} className="text-tertiary">
              Policy Canary | Regulatory Alert{"\n"}
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
// Helpers
// ---------------------------------------------------------------------------

function getConfidenceLabel(actionType: string | null): string {
  switch (actionType) {
    case "recall":
      return "Confirmed Recall";
    case "safety_alert":
      return "Under Investigation";
    case "ban_restriction":
      return "Rule Final";
    default:
      return "Review Recommended";
  }
}

function getActionLabel(actionType: string | null): string {
  switch (actionType) {
    case "recall":
      return "Recall";
    case "safety_alert":
      return "Safety Alert";
    case "ban_restriction":
      return "Ban/Restriction";
    default:
      return "Regulatory Action";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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
  backgroundColor: COLORS.urgentRed,
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

const alertLabelStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  fontWeight: 600,
  color: COLORS.urgentRed,
  margin: "4px 0 0",
};

const blufStyle: React.CSSProperties = {
  padding: "20px 40px 0",
};

const confidenceBadgeStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  fontWeight: 600,
  color: COLORS.textSecondary,
  backgroundColor: COLORS.badgeInfoBg,
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "10px",
  margin: "8px 0 0",
};

const blufTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "20px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: "16px 40px 24px",
};

const titleStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const summaryStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 12px",
};

const substanceStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "13px",
  color: COLORS.textSecondary,
  margin: "0 0 12px",
};

const deadlineBlockStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgLight,
  borderLeft: `4px solid ${COLORS.amber}`,
  padding: "12px 16px",
  margin: "0 0 12px",
};

const deadlineStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  fontWeight: 700,
  color: COLORS.amber,
  margin: 0,
};

const inlineDisclaimerStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  fontStyle: "italic",
  margin: "0 0 12px",
};

const sourceStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "13px",
  margin: "0 0 8px",
};

const sourceLinkStyle: React.CSSProperties = {
  color: COLORS.textSecondary,
  textDecoration: "underline",
};

const appLinkStyle: React.CSSProperties = {
  margin: "16px 0 0",
};

const appLinkAnchorStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "14px",
  color: COLORS.amber,
  textDecoration: "underline",
};

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${COLORS.border}`,
  borderBottom: "none",
  margin: "0 40px",
};

const footerStyle: React.CSSProperties = {
  padding: "24px 40px 32px",
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
