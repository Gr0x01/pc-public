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
}
` as const;

export const FONTS = {
  serif: "'IBM Plex Serif', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://policycanary.io";
export const FROM_ADDRESS = "Policy Canary <intelligence@policycanary.io>";
export const REPLY_TO = "support@policycanary.io";
export const PHYSICAL_ADDRESS = "Policy Canary, 9901 Brodie Lane Ste 160 #1323, Austin, TX 78748";
