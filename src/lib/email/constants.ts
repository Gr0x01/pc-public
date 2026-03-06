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
} as const;

export const FONTS = {
  serif: "'IBM Plex Serif', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://policycanary.io";
export const FROM_ADDRESS = "Policy Canary <intelligence@policycanary.io>";
export const REPLY_TO = "support@policycanary.io";
export const PHYSICAL_ADDRESS = "Policy Canary, 9901 Brodie Lane Ste 160 #1323, Austin, TX 78748";
