// Shared string literal types used across the application.
// These mirror the CHECK constraints in the database schema.

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

/** @deprecated Display-only. Pipeline uses product_categories slugs, not broad types. */
export type ProductType = "supplement" | "food" | "cosmetic" | "drug" | "medical_device" | "biologic" | "tobacco" | "veterinary";

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

/** "segment" is legacy — 3 rows remain as parent groupings for topics. Do not create new segment categories. */
export type CategoryType = "segment" | "topic" | "product_class" | "regulatory_program";

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
