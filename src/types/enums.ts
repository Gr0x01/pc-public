// Shared string literal types used across the application.
// These mirror the CHECK constraints in the database schema.

export type SegmentType = "supplements" | "cosmetics" | "food";

export type ItemType =
  | "rule"
  | "proposed_rule"
  | "notice"
  | "guidance"
  | "draft_guidance"
  | "warning_letter"
  | "recall"
  | "import_alert"
  | "483_observation"
  | "safety_alert"
  | "press_release"
  | "state_regulation";

export type RelevanceLevel = "critical" | "high" | "medium" | "low" | "none";

export type SubscriptionTier = "free" | "monitor" | "monitor_research";

export type ProductType = "supplement" | "food" | "cosmetic";

export type MatchType = "direct_substance" | "category_overlap" | "semantic";

export type NormalizationMethod =
  | "unii_exact"
  | "cas_exact"
  | "name_exact"
  | "fuzzy"
  | "llm"
  | "manual";

export type SubstanceClass =
  | "chemical"
  | "protein"
  | "botanical"
  | "mixture"
  | "polymer"
  | "nucleic_acid";

export type IngredientGroup =
  | "vitamin"
  | "mineral"
  | "botanical"
  | "amino_acid"
  | "enzyme"
  | "fatty_acid"
  | "probiotic"
  | "other";

export type CategoryType = "segment" | "topic" | "product_class" | "regulatory_program";

export type TrendDirection = "rising" | "stable" | "declining";

export type CampaignType =
  | "weekly_free"
  | "weekly_paid"
  | "product_alert"
  | "urgent_alert";

export type EmailStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained";

export type SourceType = "api" | "rss" | "scrape" | "csv" | "manual";

export type PipelineStatus = "running" | "success" | "failed" | "partial";

export type ProcessingStatus = "pending" | "ok" | "enriched" | "error" | "parse_error" | "incomplete_source";

export type VerificationStatus = "unverified" | "verified" | "rejected";

export type MatchStatus = "resolved" | "pending" | "unresolved";

export type ExtractionMethod = "structured_field" | "llm_extraction" | "manual";

export type NormalizationStatus = "matched" | "pending" | "ambiguous" | "unmatched";

export type RelationType =
  | "supersedes"
  | "amends"
  | "references"
  | "responds_to"
  | "related_enforcement"
  | "follow_up";
