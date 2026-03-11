export type IntelPageType = "ingredient" | "enforcement" | "regulation";

export const INTEL_PAGE_TYPES = [
  "ingredient",
  "enforcement",
  "regulation",
] as const;

export const PAGE_TYPE_LABELS: Record<IntelPageType, string> = {
  ingredient: "Ingredient",
  enforcement: "Enforcement",
  regulation: "Regulation",
};

export const PAGE_TYPE_ROUTES: Record<IntelPageType, string> = {
  ingredient: "ingredients",
  enforcement: "enforcement",
  regulation: "regulations",
};

// --- Structured data per page type ---

export interface IngredientData {
  substance_id?: string;
  unii?: string;
  fda_status: string;
  state_bans: string[];
  affected_categories: string[];
  key_deadlines: { date: string; label: string }[];
}

export interface EnforcementAction {
  date: string;
  type: string;
  title: string;
  url?: string;
}

export interface EnforcementData {
  company_name: string;
  total_actions: number;
  action_types: Record<string, number>;
  violation_types: string[];
  date_range: { earliest: string; latest: string };
  actions?: EnforcementAction[];
}

export interface RegulationData {
  regulation_name: string;
  current_status: string;
  cfr_references: string[];
  key_deadlines: { date: string; label: string }[];
  affected_categories: string[];
}

// --- Projections ---

/** Full intelligence page row. */
export interface IntelligencePage {
  id: string;
  page_type: IntelPageType;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  structured_data: IngredientData | EnforcementData | RegulationData;
  status: "draft" | "published" | "needs_refresh";
  seo_title: string | null;
  seo_description: string | null;
  cover_image_url: string | null;
  word_count: number;
  published_at: string | null;
  last_refreshed_at: string | null;
  refresh_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Partial projection for index pages (no content or SEO fields). */
export interface IntelligencePageSummary {
  id: string;
  page_type: IntelPageType;
  slug: string;
  title: string;
  excerpt: string;
  structured_data: IngredientData | EnforcementData | RegulationData;
  cover_image_url: string | null;
  word_count: number;
  published_at: string | null;
}

export const LINK_TYPES = [
  "ingredient_in_enforcement",
  "enforcement_of_regulation",
  "regulation_affects_ingredient",
  "related",
] as const;

export type LinkType = (typeof LINK_TYPES)[number];

/** Cross-reference link between pages. */
export interface IntelligencePageLink {
  id: string;
  link_type: LinkType;
  source_page: IntelligencePageSummary;
  target_page: IntelligencePageSummary;
}

/** Calculate reading time in minutes (230 WPM for technical content). */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 230));
}
