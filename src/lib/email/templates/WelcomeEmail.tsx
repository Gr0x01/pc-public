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

export interface WelcomeEmailProps {
  /** Subscriber's first name from onboarding. */
  first_name: string;
  /** The products the subscriber added during onboarding. */
  products: Array<{ id: string; name: string }>;
  /** Maximum products allowed on their plan (pilot: 5). */
  max_products: number;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export default function WelcomeEmail({
  first_name,
  products,
  max_products,
}: WelcomeEmailProps) {
  const hasProducts = products.length > 0;
  const canAddMore = products.length < max_products;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_CSS }} />
      </Head>
      <Preview>
        {hasProducts
          ? `${first_name}, your ${products.length} product${products.length !== 1 ? "s are" : " is"} now monitored. Here's what to expect.`
          : `${first_name}, your account is set up. Add your first product to start monitoring.`}
      </Preview>
      <Body style={bodyStyle} className="body">
        <Container style={containerStyle} className="container">
          {/* Canary top rule */}
          <Section style={topRuleStyle} className="top-rule" />

          {/* Header */}
          <Section style={headerStyle}>
            <Text style={wordmarkStyle} className="text-secondary">POLICY CANARY</Text>
          </Section>

          {/* Welcome headline */}
          <Section style={contentStyle}>
            <Text style={welcomeHeadingStyle} className="text-primary">
              Welcome, {first_name}.
            </Text>
            <Text style={welcomeBodyStyle} className="text-body">
              {hasProducts
                ? "Your products are now monitored. Policy Canary is watching every FDA regulatory action and matching it against your specific products."
                : "Your account is set up. Add your first product and Policy Canary will start watching every FDA regulatory action that could affect it."}
            </Text>
          </Section>

          {hasProducts ? (
            <>
              {/* YOUR MONITORED PRODUCTS */}
              <Section>
                <Text style={sectionLabelStyle} className="text-secondary">
                  YOUR MONITORED PRODUCTS
                </Text>
                <Section style={productListWrapperStyle}>
                  <Section style={productListBlockStyle} className="bg-light">
                    {products.map((product) => (
                      <Text key={product.id} style={productItemStyle} className="text-primary">
                        <span style={greenDotStyle} />
                        {product.name}
                      </Text>
                    ))}
                  </Section>
                </Section>
                {canAddMore && (
                  <Text style={addMoreStyle} className="text-secondary">
                    You can monitor up to {max_products} products.{" "}
                    <Link href={`${SITE_URL}/app/products`} style={addMoreLinkStyle}>
                      Add more in the web app.
                    </Link>
                  </Text>
                )}
              </Section>

              <Hr style={dividerStyle} className="border-light" />
            </>
          ) : (
            <>
              {/* ADD YOUR FIRST PRODUCT nudge */}
              <Section style={nudgeSectionStyle}>
                <Section style={productListWrapperStyle}>
                  <Section style={nudgeBlockStyle} className="bg-light">
                    <Text style={nudgeTextStyle} className="text-body">
                      Add your first product to start monitoring. We&apos;ll
                      watch every FDA regulatory action and alert you to anything
                      that affects it.
                    </Text>
                    <Link href={`${SITE_URL}/app/products`} style={buttonStyle}>
                      Add your products
                    </Link>
                  </Section>
                </Section>
              </Section>

              <Hr style={dividerStyle} className="border-light" />
            </>
          )}

          {/* WHAT HAPPENS NEXT */}
          <Section style={expectationsStyle}>
            <Text style={expectationsHeadingStyle} className="text-primary">
              What happens next
            </Text>

            <Text style={expectationLabelStyle} className="text-body">
              Product Intelligence Briefing
            </Text>
            <Text style={expectationBodyStyle} className="text-body">
              Every week, you&apos;ll receive a briefing covering FDA actions
              that affect your specific products — with action items and
              deadlines. If nothing affects your products, you&apos;ll get a
              brief all-clear confirmation.
            </Text>

            <Text style={expectationLabelStyle} className="text-body">
              Regulatory Alerts
            </Text>
            <Text style={expectationBodyStyle} className="text-body">
              If something urgent affects your products — a recall, a ban, an
              enforcement action — you&apos;ll hear from us immediately, not at
              the next weekly briefing.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonSectionStyle}>
            <Link href={hasProducts ? `${SITE_URL}/app/feed` : `${SITE_URL}/app/products`} style={buttonStyle}>
              {hasProducts ? "View your regulatory feed" : "Add your products"}
            </Link>
          </Section>

          {/* Footer */}
          <Hr style={dividerStyle} className="border-light" />
          <Section style={footerStyle} className="footer">
            <Text style={footerLinksStyle}>
              <Link href={`${SITE_URL}/app/products`} style={footerLinkStyle}>
                Manage your products
              </Link>
            </Text>
            <Text style={footerAddressStyle} className="text-tertiary">
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
  textTransform: "uppercase" as const,
};

const contentStyle: React.CSSProperties = {
  padding: "24px 40px 0",
};

const welcomeHeadingStyle: React.CSSProperties = {
  fontFamily: FONTS.serif,
  fontSize: "24px",
  fontWeight: 700,
  color: COLORS.textPrimary,
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const welcomeBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: 0,
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

const productListWrapperStyle: React.CSSProperties = {
  padding: "0 40px",
};

const productListBlockStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgLight,
  padding: "20px 24px",
  borderRadius: "4px",
};

const productItemStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  lineHeight: "1.4",
  margin: "0 0 8px",
};

const greenDotStyle: React.CSSProperties = {
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: COLORS.confirmedGreen,
  marginRight: "8px",
  verticalAlign: "middle",
};

const addMoreStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "13px",
  color: COLORS.textSecondary,
  margin: "12px 0 0",
  padding: "0 40px",
};

const addMoreLinkStyle: React.CSSProperties = {
  color: COLORS.textSecondary,
  textDecoration: "underline",
};

const nudgeSectionStyle: React.CSSProperties = {
  padding: "24px 0 0",
};

const nudgeBlockStyle: React.CSSProperties = {
  backgroundColor: COLORS.bgLight,
  padding: "24px 24px",
  borderRadius: "4px",
  textAlign: "center" as const,
};

const nudgeTextStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const dividerStyle: React.CSSProperties = {
  borderTop: `1px solid ${COLORS.border}`,
  borderBottom: "none",
  margin: "32px 40px",
};

const expectationsStyle: React.CSSProperties = {
  padding: "0 40px",
};

const expectationsHeadingStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "16px",
  fontWeight: 600,
  color: COLORS.textPrimary,
  margin: "0 0 12px",
};

const expectationLabelStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  fontWeight: 600,
  color: COLORS.textBody,
  margin: "0 0 4px",
};

const expectationBodyStyle: React.CSSProperties = {
  fontFamily: FONTS.sans,
  fontSize: "15px",
  color: COLORS.textBody,
  lineHeight: "1.5",
  margin: "0 0 16px",
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

const footerStyle: React.CSSProperties = {
  padding: "0 40px 32px",
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
