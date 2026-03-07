import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
  Preview,
} from "@react-email/components";
import { COLORS, FONTS, LOGO_DARK_DATA_URI, LOGO_LIGHT_DATA_URI, SITE_URL, PHYSICAL_ADDRESS, DARK_MODE_CSS } from "../constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AuthEmailVariant = "magic-link" | "confirm-signup" | "change-email" | "invite";

export interface AuthEmailProps {
  variant: AuthEmailVariant;
  /** The action URL (magic link, confirmation link, etc). */
  action_url: string;
  /** New email address — only used for change-email variant. */
  new_email?: string;
}

const VARIANT_CONFIG: Record<
  AuthEmailVariant,
  {
    preview: string;
    heading: string;
    body: (newEmail?: string) => string;
    button: string;
    security: string;
  }
> = {
  "magic-link": {
    preview: "Sign in to Policy Canary",
    heading: "Sign in to Policy Canary",
    body: () => "Click the button below to sign in. This link is valid for one hour.",
    button: "Sign in",
    security: "If you didn't request this link, you can safely ignore this email.",
  },
  "confirm-signup": {
    preview: "Confirm your Policy Canary email",
    heading: "Confirm your email",
    body: () => "Click the button below to confirm your email and activate your account.",
    button: "Confirm email",
    security: "If you didn't sign up for Policy Canary, you can safely ignore this email.",
  },
  "change-email": {
    preview: "Confirm your new email address",
    heading: "Confirm email change",
    body: (newEmail) =>
      `Click the button below to confirm changing your email${newEmail ? ` to ${newEmail}` : ""}.`,
    button: "Confirm new email",
    security: "If you didn't request this change, please contact support immediately.",
  },
  invite: {
    preview: "You've been invited to Policy Canary",
    heading: "You've been invited",
    body: () =>
      "You've been invited to join Policy Canary. Click below to accept and set up your account.",
    button: "Accept invitation",
    security: "If you weren't expecting this invitation, you can safely ignore this email.",
  },
};

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export default function AuthEmail({ variant, action_url, new_email }: AuthEmailProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_CSS }} />
      </Head>
      <Preview>{config.preview}</Preview>
      <Body style={bodyStyle} className="body">
        <Container style={containerStyle} className="container">
          {/* Canary top rule */}
          <Section style={topRuleStyle} className="top-rule" />

          {/* Header */}
          <Section style={headerStyle}>
            <Img src={LOGO_DARK_DATA_URI} width="110" height="10" alt="Policy Canary" className="logo-dark" style={wordmarkImgStyle} />
            <Img src={LOGO_LIGHT_DATA_URI} width="110" height="10" alt="Policy Canary" className="logo-light" style={{ ...wordmarkImgStyle, display: "none" }} />
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Text style={headingStyle} className="text-primary">
              {config.heading}
            </Text>
            <Text style={bodyTextStyle} className="text-body">
              {config.body(new_email)}
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSectionStyle}>
            <Link href={action_url} style={buttonStyle}>
              {config.button}
            </Link>
          </Section>

          {/* Fallback URL */}
          <Section style={fallbackStyle}>
            <Text style={fallbackLabelStyle} className="text-secondary">
              Or copy this URL into your browser:
            </Text>
            <Text style={fallbackUrlStyle}>{action_url}</Text>
          </Section>

          {/* Security note */}
          <Section style={securityStyle}>
            <Text style={securityTextStyle} className="text-tertiary">
              {config.security}
            </Text>
          </Section>

          {/* Divider + Footer */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={footerStyle} className="footer">
            <Text style={footerTextStyle} className="text-tertiary">
              {PHYSICAL_ADDRESS}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
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
  maxWidth: "480px",
  margin: "0 auto",
};

const topRuleStyle: React.CSSProperties = {
  backgroundColor: COLORS.canary,
  height: "3px",
};

const headerStyle: React.CSSProperties = {
  padding: "32px 40px 0",
};

const wordmarkImgStyle: React.CSSProperties = {
  display: "block",
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: "24px 40px 0",
};

const headingStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "22px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 24px",
};

const buttonSectionStyle: React.CSSProperties = {
  padding: "0 40px 8px",
  textAlign: "center" as const,
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 32px",
  fontFamily: FONTS.sans,
  fontSize: "15px",
  fontWeight: 600,
  color: "#FFFFFF",
  backgroundColor: COLORS.amber,
  borderRadius: "4px",
  textDecoration: "none",
};

const fallbackStyle: React.CSSProperties = {
  padding: "8px 40px 0",
};

const fallbackLabelStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textSecondary,
  lineHeight: "1.5",
  margin: 0,
};

const fallbackUrlStyle: React.CSSProperties = {
  fontFamily: FONTS.mono,
  fontSize: "12px",
  color: COLORS.textSecondary,
  lineHeight: "1.5",
  margin: "4px 0 0",
  wordBreak: "break-all" as const,
};

const securityStyle: React.CSSProperties = {
  padding: "24px 40px 0",
};

const securityTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textTertiary,
  lineHeight: "1.5",
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${COLORS.border}`,
  borderBottom: "none",
  margin: "24px 40px 0",
};

const footerStyle: React.CSSProperties = {
  padding: "20px 40px 32px",
};

const footerTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "12px",
  color: COLORS.textTertiary,
  lineHeight: "1.5",
  margin: 0,
};
