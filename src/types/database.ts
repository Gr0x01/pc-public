/**
 * Hand-written TypeScript types matching the v1 database schema.
 * Run `supabase gen types typescript` to auto-generate after connecting to Supabase.
 */

import type {
  CategoryType,
  CampaignType,
  EmailStatus,
  ExtractionMethod,
  IngredientGroup,
  ItemType,
  MatchStatus,
  MatchType,
  NormalizationMethod,
  NormalizationStatus,
  PipelineStatus,
  ProcessingStatus,
  RelationType,
  RelevanceLevel,
  SourceType,
  SubstanceClass,
  SubscriptionTier,
  TrendDirection,
  VerificationStatus,
} from "./enums";

// --------------------------------------------------------------------------
// Layer 1: Source Data
// --------------------------------------------------------------------------

export interface Source {
  id: string;
  name: string;
  source_type: SourceType;
  base_url: string | null;
  last_synced_at: string | null;
  sync_config: Record<string, unknown> | null;
  created_at: string;
}

export interface PipelineRun {
  id: string;
  source_id: string;
  started_at: string;
  completed_at: string | null;
  items_fetched: number;
  items_created: number;
  items_updated: number;
  items_skipped: number;
  status: PipelineStatus;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface RegulatoryItem {
  id: string;
  source_id: string;
  source_ref: string;
  source_url: string | null;
  title: string;
  raw_content: string | null;
  item_type: ItemType;
  jurisdiction: "federal" | "state";
  jurisdiction_state: string | null;
  published_date: string;
  effective_date: string | null;
  comment_deadline: string | null;
  docket_number: string | null;
  issuing_office: string | null;
  fr_citation: string | null;
  cfr_references: Array<{ title: number; part: number }> | null;
  action_text: string | null;
  page_views: number | null;
  significant: boolean | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------------
// Layer 2: Classification
// --------------------------------------------------------------------------

export interface RegulatoryCategory {
  id: string;
  slug: string;
  label: string;
  category_type: CategoryType;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface ItemCategory {
  item_id: string;
  category_id: string;
  confidence: number | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 3: Substance Reference
// --------------------------------------------------------------------------

export interface Substance {
  id: string;
  canonical_name: string;
  unii: string | null;
  cas_number: string | null;
  inchi_key: string | null;
  substance_class: SubstanceClass | null;
  ingredient_group: IngredientGroup | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubstanceName {
  id: string;
  substance_id: string;
  name: string;
  name_type: "preferred" | "systematic" | "common" | "brand" | "abbreviation";
  language: string;
  source: "gsrs" | "dsld" | "openfoodfacts" | "user" | "manual";
  created_at: string;
}

export interface SubstanceCode {
  id: string;
  substance_id: string;
  code_system: string;
  code_value: string;
  code_type: string | null;
  is_classification: boolean;
  comments: string | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 4: Enrichment
// --------------------------------------------------------------------------

export interface ItemEnrichment {
  id: string;
  item_id: string;
  summary: string;
  key_regulations: string[] | null;
  key_entities: string[] | null;
  enrichment_model: string;
  enrichment_version: number;
  confidence: number | null;
  verification_status: VerificationStatus;
  raw_response: Record<string, unknown> | null;
  regulatory_action_type: string | null;
  deadline: string | null; // ISO date string
  created_at: string;
}

export interface SegmentImpact {
  id: string;
  item_id: string;
  category_id: string;
  relevance: RelevanceLevel;
  impact_summary: string | null;
  action_items: string[] | null; // JSONB in DB, stored as string array
  who_affected: string | null;
  deadline: string | null;
  published_date: string;
  verification_status: VerificationStatus;
  signal_source: "direct" | "cross_reference";
  created_at: string;
}

export interface ItemEnrichmentTag {
  id: string;
  item_id: string;
  tag_dimension: "product_type" | "facility_type" | "claims" | "regulation";
  tag_value: string;
  confidence: number | null;
  signal_source: "direct" | "cross_reference";
  created_at: string;
}

export interface RegulatoryItemSubstance {
  id: string;
  regulatory_item_id: string;
  substance_id: string | null;
  raw_substance_name: string;
  unii: string | null;
  cas_number: string | null;
  match_status: MatchStatus;
  extraction_method: ExtractionMethod;
  confidence: number | null;
  created_at: string;
}

export interface ItemCitation {
  id: string;
  enrichment_id: string | null;
  segment_impact_id: string | null;
  item_id: string;
  claim_text: string;
  quote_text: string;
  source_section: string | null;
  source_url: string | null;
  source_label: string | null;
  quote_verified: boolean;
  confidence: number | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 5: Search & Retrieval
// --------------------------------------------------------------------------

export interface ItemChunk {
  id: string;
  item_id: string;
  segment_impact_id: string | null;
  chunk_index: number;
  section_title: string | null;
  content: string;
  embedding: number[] | null; // halfvec(1536) in DB — represented as number[] in app code
  token_count: number | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 6: Intelligence
// --------------------------------------------------------------------------

export interface ItemRelation {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relation_type: RelationType;
  created_at: string;
}

export interface EnforcementDetail {
  id: string;
  item_id: string;
  company_name: string | null;
  company_address: string | null;
  products: string[] | null; // JSONB in DB — array of product name strings
  violation_types: string[] | null;
  cited_regulations: string[] | null;
  fei_number: string | null;
  marcs_cms_number: string | null;
  recipient_name: string | null;
  recipient_title: string | null;
  response_received: boolean | null;
  closeout: boolean | null;
  recall_classification: "Class I" | "Class II" | "Class III" | null;
  recall_status: "Ongoing" | "Completed" | "Terminated" | null;
  voluntary_mandated: string | null;
  distribution_pattern: string | null;
  product_quantity: string | null;
  created_at: string;
}

export interface TrendSignal {
  id: string;
  category_id: string;
  period_start: string;
  period_end: string;
  item_count: number;
  avg_relevance: number | null;
  prev_period_count: number | null;
  trend_direction: TrendDirection;
  trend_summary: string | null;
  computed_at: string;
}

// --------------------------------------------------------------------------
// Layer 7: Users & Email
// --------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string | null;
  stripe_customer_id: string | null;
  access_level: SubscriptionTier; // DB default: 'free'
  max_products: number; // DB default: 1
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  user_id: string | null;
  status: "active" | "unsubscribed" | "bounced" | "complained";
  unsubscribe_token: string;
  source: "signup_form" | "stripe" | "manual" | "referral" | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export interface UserBookmark {
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  campaign_type: CampaignType;
  subscriber_id: string | null;
  subject_line: string;
  period_start: string | null;
  period_end: string | null;
  html_content: string | null;
  recipient_count: number;
  status: "draft" | "generating" | "sending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
}

export interface EmailCampaignItem {
  campaign_id: string;
  item_id: string;
  position: number;
  content_level: "headline" | "summary" | "full_analysis";
}

export interface EmailSend {
  id: string;
  campaign_id: string;
  subscriber_id: string;
  provider_message_id: string | null;
  status: EmailStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounce_type: "hard" | "soft" | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 8: Subscriber Products
// --------------------------------------------------------------------------

export interface SubscriberProduct {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  product_type: "supplement" | "food" | "cosmetic";
  data_source: "dsld" | "fdc" | "manual" | "openfoodfacts";
  external_id: string | null;
  upc_barcode: string | null;
  label_image_url: string | null;
  raw_ingredients_text: string | null;
  product_metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  name: string;
  normalized_name: string | null;
  substance_id: string | null;
  amount: string | null;
  unit: string | null;
  sort_order: number;
  normalization_status: NormalizationStatus;
  normalization_confidence: number | null;
  normalization_method: NormalizationMethod | null;
  source_metadata: Record<string, unknown> | null;
  created_at: string;
}

// --------------------------------------------------------------------------
// Layer 9: Product Matching
// --------------------------------------------------------------------------

export interface ProductMatch {
  id: string;
  product_id: string;
  regulatory_item_id: string;
  match_type: MatchType;
  match_method: string | null;
  confidence: number;
  matched_substances: Array<{
    substance_id: string;
    substance_name: string;
    match_detail: string;
  }> | null;
  matched_tags: Array<{ dimension: string; value: string }> | null;
  impact_summary: string | null;
  action_items: string[] | null;
  is_dismissed: boolean;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
