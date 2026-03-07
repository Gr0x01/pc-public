/** Shared email design tokens matching the design spec. */

export const COLORS = {
  canary: "#EAC100",
  textPrimary: "#0F172A",
  textBody: "#334155",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  amber: "#D97706",
  urgentRed: "#DC2626",
  confirmedGreen: "#059669",
  border: "#E2E8F0",
  bgLight: "#F8FAFC",
  bgWhite: "#FFFFFF",
  // Badge backgrounds
  badgeUrgentBg: "#FEF2F2",
  badgeWatchBg: "#FFFBEB",
  badgeInfoBg: "#F1F5F9",
  badgeClearBg: "#ECFDF5",
  // Bridge section
  bridgeBg: "#FFFBEB",
  // Dark mode
  darkNavy: "#0F172A",
  darkSurface: "#1E293B",
  darkBorder: "#334155",
  darkTextPrimary: "#F1F5F9",
  darkTextBody: "#CBD5E1",
  darkTextSecondary: "#94A3B8",
  darkTextTertiary: "#64748B",
} as const;

/**
 * Dark mode CSS for email `<style>` blocks.
 * Only Apple Mail / iOS Mail respect @media (prefers-color-scheme: dark).
 * Gmail does its own forced inversion; Outlook ignores it entirely.
 * We use the brand navy (#0F172A) instead of letting clients invert to pure black.
 */
export const DARK_MODE_CSS = `
@media (prefers-color-scheme: dark) {
  body, .body { background-color: ${COLORS.darkNavy} !important; }
  .container { background-color: ${COLORS.darkSurface} !important; }
  .text-primary { color: ${COLORS.darkTextPrimary} !important; }
  .text-body { color: ${COLORS.darkTextBody} !important; }
  .text-secondary { color: ${COLORS.darkTextSecondary} !important; }
  .text-tertiary { color: ${COLORS.darkTextTertiary} !important; }
  .border-light { border-color: ${COLORS.darkBorder} !important; }
  .bg-light { background-color: #1E293B !important; }
  .bg-bridge { background-color: #2D2006 !important; }
  .badge-urgent { background-color: #450A0A !important; }
  .badge-watch { background-color: #422006 !important; }
  .badge-info { background-color: #1E293B !important; }
  .action-block { background-color: #1E293B !important; border-left-color: ${COLORS.amber} !important; }
  .top-rule { background-color: ${COLORS.canary} !important; }
  .top-rule-alert { background-color: ${COLORS.urgentRed} !important; }
  a { color: ${COLORS.canary} !important; }
  .footer a { color: ${COLORS.darkTextSecondary} !important; }
  .logo-dark { display: none !important; }
  .logo-light { display: block !important; }
}
` as const;

export const FONTS = {
  serif: "'IBM Plex Serif', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
} as const;

/** Base64-encoded logo PNGs (300x28 @2x). Inline to avoid broken images in email previews. */
export const LOGO_DARK_DATA_URI = "data:image/png;base64,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";
export const LOGO_LIGHT_DATA_URI = "data:image/png;base64,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";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://policycanary.io";
export const FROM_ADDRESS = "Policy Canary <intelligence@policycanary.io>";
export const REPLY_TO = "support@policycanary.io";
export const PHYSICAL_ADDRESS = "Policy Canary, 9901 Brodie Lane Ste 160 #1323, Austin, TX 78748";
