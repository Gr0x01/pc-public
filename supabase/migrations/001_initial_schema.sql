-- =============================================================================
-- Policy Canary v1 Schema
-- 9 Layers, 25 tables, substances-based matching
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';


-- =============================================================================
-- LAYER 1: SOURCE DATA
-- =============================================================================

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'scrape', 'csv', 'manual')),
  base_url TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  items_fetched INT DEFAULT 0,
  items_created INT DEFAULT 0,
  items_updated INT DEFAULT 0,
  items_skipped INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_runs_source_id ON pipeline_runs (source_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs (status);
CREATE INDEX idx_pipeline_runs_started_at ON pipeline_runs (started_at DESC);

CREATE TABLE regulatory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  source_ref TEXT NOT NULL,
  source_url TEXT,
  title TEXT NOT NULL,
  raw_content TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'rule', 'proposed_rule', 'notice', 'guidance', 'draft_guidance',
    'warning_letter', 'recall', 'import_alert', '483_observation',
    'safety_alert', 'press_release', 'state_regulation'
  )),
  jurisdiction TEXT NOT NULL DEFAULT 'federal' CHECK (jurisdiction IN ('federal', 'state')),
  jurisdiction_state TEXT CHECK (
    (jurisdiction = 'federal' AND jurisdiction_state IS NULL) OR
    (jurisdiction = 'state' AND jurisdiction_state IS NOT NULL)
  ),
  published_date DATE NOT NULL,
  effective_date DATE,
  comment_deadline DATE,
  docket_number TEXT,
  issuing_office TEXT,
  fr_citation TEXT,
  cfr_references JSONB,
  action_text TEXT,
  page_views INT,
  significant BOOLEAN,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'ok', 'parse_error', 'incomplete_source')),
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_regulatory_items_source_ref UNIQUE (source_id, source_ref)
);

CREATE INDEX idx_regulatory_items_published_date ON regulatory_items (published_date DESC);
CREATE INDEX idx_regulatory_items_item_type ON regulatory_items (item_type);
CREATE INDEX idx_regulatory_items_type_date ON regulatory_items (item_type, published_date DESC);
CREATE INDEX idx_regulatory_items_jurisdiction ON regulatory_items (jurisdiction);
CREATE INDEX idx_regulatory_items_processing_status ON regulatory_items (processing_status) WHERE processing_status != 'ok';

CREATE TRIGGER update_regulatory_items_updated_at
  BEFORE UPDATE ON regulatory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- LAYER 2: CLASSIFICATION
-- =============================================================================

CREATE TABLE regulatory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('segment', 'topic', 'product_class', 'regulatory_program')),
  parent_id UUID REFERENCES regulatory_categories(id),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regulatory_categories_type ON regulatory_categories (category_type);
CREATE INDEX idx_regulatory_categories_parent ON regulatory_categories (parent_id);
CREATE INDEX idx_regulatory_categories_slug ON regulatory_categories (slug);

CREATE TABLE item_categories (
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES regulatory_categories(id) ON DELETE CASCADE,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, category_id)
);

CREATE INDEX idx_item_categories_category ON item_categories (category_id);


-- =============================================================================
-- LAYER 3: SUBSTANCE REFERENCE
-- =============================================================================

CREATE TABLE substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  unii CHAR(10) UNIQUE,
  cas_number TEXT,
  inchi_key TEXT,
  substance_class TEXT CHECK (substance_class IN ('chemical', 'protein', 'botanical', 'mixture', 'polymer', 'nucleic_acid')),
  ingredient_group TEXT CHECK (ingredient_group IN ('vitamin', 'mineral', 'botanical', 'amino_acid', 'enzyme', 'fatty_acid', 'probiotic', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_substances_unii ON substances (unii) WHERE unii IS NOT NULL;
CREATE INDEX idx_substances_cas ON substances (cas_number) WHERE cas_number IS NOT NULL;
CREATE INDEX idx_substances_canonical_name ON substances (canonical_name);
CREATE INDEX idx_substances_class ON substances (substance_class);
CREATE INDEX idx_substances_group ON substances (ingredient_group);

CREATE TRIGGER update_substances_updated_at
  BEFORE UPDATE ON substances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE substance_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id UUID NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_type TEXT NOT NULL CHECK (name_type IN ('preferred', 'systematic', 'common', 'brand', 'abbreviation')),
  language CHAR(2) NOT NULL DEFAULT 'en',
  source TEXT NOT NULL CHECK (source IN ('gsrs', 'dsld', 'openfoodfacts', 'user', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_substance_names UNIQUE (substance_id, name)
);

CREATE INDEX idx_substance_names_substance ON substance_names (substance_id);
CREATE INDEX idx_substance_names_trgm ON substance_names USING GIN (name gin_trgm_ops);
CREATE INDEX idx_substance_names_fts ON substance_names USING GIN (to_tsvector('english', name));
CREATE INDEX idx_substance_names_source ON substance_names (source);


-- =============================================================================
-- LAYER 4: ENRICHMENT
-- =============================================================================

CREATE TABLE item_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_regulations TEXT[],
  key_entities TEXT[],
  enrichment_model TEXT NOT NULL,
  enrichment_version INT NOT NULL DEFAULT 1,
  confidence REAL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_enrichments_version UNIQUE (item_id, enrichment_version)
);

CREATE INDEX idx_item_enrichments_item ON item_enrichments (item_id);

CREATE TABLE segment_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES regulatory_categories(id) ON DELETE CASCADE,
  relevance TEXT NOT NULL CHECK (relevance IN ('critical', 'high', 'medium', 'low', 'none')),
  impact_summary TEXT,
  action_items JSONB,
  who_affected TEXT,
  deadline DATE,
  published_date DATE NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_segment_impacts_item_category UNIQUE (item_id, category_id)
);

CREATE INDEX idx_segment_impacts_feed ON segment_impacts (category_id, relevance, published_date DESC);
CREATE INDEX idx_segment_impacts_item ON segment_impacts (item_id);
CREATE INDEX idx_segment_impacts_published ON segment_impacts (published_date DESC);

CREATE TABLE item_enrichment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  tag_dimension TEXT NOT NULL CHECK (tag_dimension IN ('product_type', 'facility_type', 'claims', 'regulation')),
  tag_value TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_tags UNIQUE (item_id, tag_dimension, tag_value)
);

CREATE INDEX idx_item_enrichment_tags_item ON item_enrichment_tags (item_id);
CREATE INDEX idx_item_enrichment_tags_dimension_value ON item_enrichment_tags (tag_dimension, tag_value);

CREATE TABLE regulatory_item_substances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  substance_id UUID REFERENCES substances(id),
  raw_substance_name TEXT NOT NULL,
  unii CHAR(10),
  cas_number TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('resolved', 'pending', 'unresolved')),
  extraction_method TEXT NOT NULL CHECK (extraction_method IN ('structured_field', 'llm_extraction', 'manual')),
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ris_item ON regulatory_item_substances (regulatory_item_id);
CREATE INDEX idx_ris_substance ON regulatory_item_substances (substance_id) WHERE substance_id IS NOT NULL;
CREATE INDEX idx_ris_match_status ON regulatory_item_substances (match_status) WHERE match_status = 'pending';
CREATE INDEX idx_ris_raw_name ON regulatory_item_substances (raw_substance_name);

CREATE TABLE item_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrichment_id UUID REFERENCES item_enrichments(id) ON DELETE CASCADE,
  segment_impact_id UUID REFERENCES segment_impacts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  quote_text TEXT NOT NULL,
  source_section TEXT,
  source_url TEXT,
  source_label TEXT,
  quote_verified BOOLEAN NOT NULL DEFAULT false,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_citation_parent CHECK (enrichment_id IS NOT NULL OR segment_impact_id IS NOT NULL)
);

CREATE INDEX idx_item_citations_enrichment ON item_citations (enrichment_id);
CREATE INDEX idx_item_citations_segment_impact ON item_citations (segment_impact_id);
CREATE INDEX idx_item_citations_item ON item_citations (item_id);


-- =============================================================================
-- LAYER 5: SEARCH & RETRIEVAL
-- Note: HNSW index should be created AFTER 1,000+ rows are inserted.
-- Command: CREATE INDEX CONCURRENTLY idx_item_chunks_embedding
--   ON item_chunks USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
-- =============================================================================

CREATE TABLE item_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  segment_impact_id UUID REFERENCES segment_impacts(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  section_title TEXT,
  content TEXT NOT NULL,
  embedding halfvec(1536),
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_chunks_item ON item_chunks (item_id);
CREATE INDEX idx_item_chunks_segment_impact ON item_chunks (segment_impact_id) WHERE segment_impact_id IS NOT NULL;


-- =============================================================================
-- LAYER 6: INTELLIGENCE
-- =============================================================================

CREATE TABLE item_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('supersedes', 'amends', 'references', 'responds_to', 'related_enforcement', 'follow_up')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_relations UNIQUE (source_item_id, target_item_id, relation_type)
);

CREATE INDEX idx_item_relations_source ON item_relations (source_item_id);
CREATE INDEX idx_item_relations_target ON item_relations (target_item_id);

CREATE TABLE enforcement_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES regulatory_items(id) ON DELETE CASCADE,
  company_name TEXT,
  company_address TEXT,
  products JSONB,
  violation_types TEXT[],
  cited_regulations TEXT[],
  fei_number TEXT,
  marcs_cms_number TEXT,
  recipient_name TEXT,
  recipient_title TEXT,
  response_received BOOLEAN,
  closeout BOOLEAN,
  recall_classification TEXT CHECK (recall_classification IN ('Class I', 'Class II', 'Class III')),
  recall_status TEXT CHECK (recall_status IN ('Ongoing', 'Completed', 'Terminated')),
  voluntary_mandated TEXT,
  distribution_pattern TEXT,
  product_quantity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enforcement_company ON enforcement_details (company_name);
CREATE INDEX idx_enforcement_violation_types ON enforcement_details USING GIN (violation_types);
CREATE INDEX idx_enforcement_marcs ON enforcement_details (marcs_cms_number) WHERE marcs_cms_number IS NOT NULL;
CREATE INDEX idx_enforcement_fei ON enforcement_details (fei_number) WHERE fei_number IS NOT NULL;

CREATE TABLE trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES regulatory_categories(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  item_count INT NOT NULL,
  avg_relevance REAL,
  prev_period_count INT,
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('rising', 'stable', 'declining')),
  trend_summary TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_trend_signals UNIQUE (category_id, period_start, period_end)
);

CREATE INDEX idx_trend_signals_category ON trend_signals (category_id);
CREATE INDEX idx_trend_signals_direction ON trend_signals (trend_direction) WHERE trend_direction = 'rising';


-- =============================================================================
-- LAYER 7: USERS & EMAIL
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  stripe_customer_id TEXT UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'monitor', 'monitor_research')),
  max_products INT NOT NULL DEFAULT 1,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_stripe ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_access_level ON users (access_level);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained')),
  unsubscribe_token TEXT UNIQUE NOT NULL,
  source TEXT CHECK (source IN ('signup_form', 'stripe', 'manual', 'referral')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_subscribers_email ON email_subscribers (email);
CREATE INDEX idx_email_subscribers_user ON email_subscribers (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_email_subscribers_status ON email_subscribers (status);
CREATE INDEX idx_email_subscribers_token ON email_subscribers (unsubscribe_token);

CREATE TABLE user_bookmarks (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('weekly_free', 'weekly_paid', 'product_alert', 'urgent_alert')),
  subscriber_id UUID REFERENCES email_subscribers(id),
  subject_line TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  html_content TEXT,
  recipient_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_campaigns_type ON email_campaigns (campaign_type);
CREATE INDEX idx_email_campaigns_subscriber ON email_campaigns (subscriber_id) WHERE subscriber_id IS NOT NULL;
CREATE INDEX idx_email_campaigns_sent ON email_campaigns (sent_at DESC);
CREATE INDEX idx_email_campaigns_status ON email_campaigns (status);

CREATE TABLE email_campaign_items (
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  position INT NOT NULL,
  content_level TEXT NOT NULL CHECK (content_level IN ('headline', 'summary', 'full_analysis')),
  PRIMARY KEY (campaign_id, item_id)
);

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES email_subscribers(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_sends_campaign ON email_sends (campaign_id);
CREATE INDEX idx_email_sends_subscriber ON email_sends (subscriber_id);
CREATE INDEX idx_email_sends_status ON email_sends (status);
CREATE INDEX idx_email_sends_subscriber_recent ON email_sends (subscriber_id, sent_at DESC);


-- =============================================================================
-- LAYER 8: SUBSCRIBER PRODUCTS
-- =============================================================================

CREATE TABLE subscriber_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('supplement', 'food', 'cosmetic')),
  data_source TEXT NOT NULL CHECK (data_source IN ('dsld', 'fdc', 'manual', 'openfoodfacts')),
  external_id TEXT,
  upc_barcode TEXT,
  label_image_url TEXT,
  raw_ingredients_text TEXT,
  product_metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriber_products_user ON subscriber_products (user_id);
CREATE INDEX idx_subscriber_products_type ON subscriber_products (product_type);
CREATE INDEX idx_subscriber_products_external ON subscriber_products (data_source, external_id) WHERE external_id IS NOT NULL;

CREATE TRIGGER update_subscriber_products_updated_at
  BEFORE UPDATE ON subscriber_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES subscriber_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT,
  substance_id UUID REFERENCES substances(id),
  amount TEXT,
  unit TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  normalization_status TEXT NOT NULL DEFAULT 'pending' CHECK (normalization_status IN ('matched', 'pending', 'ambiguous', 'unmatched')),
  normalization_confidence REAL,
  normalization_method TEXT CHECK (normalization_method IN ('unii_exact', 'cas_exact', 'name_exact', 'fuzzy', 'llm', 'manual')),
  source_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_ingredients_product ON product_ingredients (product_id);
CREATE INDEX idx_product_ingredients_substance ON product_ingredients (substance_id) WHERE substance_id IS NOT NULL;
CREATE INDEX idx_product_ingredients_normalized_name ON product_ingredients (normalized_name) WHERE normalized_name IS NOT NULL;
CREATE INDEX idx_product_ingredients_status ON product_ingredients (normalization_status) WHERE normalization_status = 'pending';


-- =============================================================================
-- LAYER 9: PRODUCT MATCHING
-- =============================================================================

CREATE TABLE product_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES subscriber_products(id) ON DELETE CASCADE,
  regulatory_item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('direct_substance', 'category_overlap', 'semantic')),
  match_method TEXT,
  confidence REAL NOT NULL,
  matched_substances JSONB,
  matched_tags JSONB,
  impact_summary TEXT,
  action_items JSONB,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_matches UNIQUE (product_id, regulatory_item_id)
);

CREATE INDEX idx_product_matches_product ON product_matches (product_id);
CREATE INDEX idx_product_matches_item ON product_matches (regulatory_item_id);
CREATE INDEX idx_product_matches_user_recent ON product_matches (product_id, created_at DESC);
CREATE INDEX idx_product_matches_confidence ON product_matches (confidence DESC) WHERE is_dismissed = false;

CREATE TRIGGER update_product_matches_updated_at
  BEFORE UPDATE ON product_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- ROW LEVEL SECURITY
-- Pipeline writes use the admin/service-role client and bypass RLS.
-- Browser/anon/authenticated access is scoped to the authenticated user's data.
-- =============================================================================

-- User-facing tables: enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Regulatory/pipeline tables: enable RLS, authenticated read-only
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_enrichment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_item_substances ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_signals ENABLE ROW LEVEL SECURITY;

-- Users: self only
CREATE POLICY "users_self_only"
  ON users FOR ALL
  USING (auth.uid() = id);

-- Subscriber products: owner only
CREATE POLICY "subscriber_products_owner_only"
  ON subscriber_products FOR ALL
  USING (auth.uid() = user_id);

-- Product ingredients: via product ownership
CREATE POLICY "product_ingredients_owner_only"
  ON product_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM subscriber_products sp
      WHERE sp.id = product_id AND sp.user_id = auth.uid()
    )
  );

-- Product matches: via product ownership
CREATE POLICY "product_matches_owner_only"
  ON product_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM subscriber_products sp
      WHERE sp.id = product_id AND sp.user_id = auth.uid()
    )
  );

-- User bookmarks: owner only
CREATE POLICY "user_bookmarks_owner_only"
  ON user_bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- Email subscribers: own record only (via linked user)
CREATE POLICY "email_subscribers_owner_only"
  ON email_subscribers FOR SELECT
  USING (auth.uid() = user_id);

-- Email campaigns + sends: via subscriber ownership (read-only for subscribers)
CREATE POLICY "email_campaigns_subscriber_only"
  ON email_campaigns FOR SELECT
  USING (
    subscriber_id IS NULL -- generic campaigns visible to all authenticated
    OR EXISTS (
      SELECT 1 FROM email_subscribers es
      WHERE es.id = subscriber_id AND es.user_id = auth.uid()
    )
  );

CREATE POLICY "email_sends_subscriber_only"
  ON email_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_subscribers es
      WHERE es.id = subscriber_id AND es.user_id = auth.uid()
    )
  );

-- Regulatory / pipeline data: authenticated users can read, no write from browser
CREATE POLICY "regulatory_items_authenticated_read"
  ON regulatory_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "sources_authenticated_read"
  ON sources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pipeline_runs_authenticated_read"
  ON pipeline_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "regulatory_categories_authenticated_read"
  ON regulatory_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_categories_authenticated_read"
  ON item_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "substances_authenticated_read"
  ON substances FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "substance_names_authenticated_read"
  ON substance_names FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_enrichments_authenticated_read"
  ON item_enrichments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "segment_impacts_authenticated_read"
  ON segment_impacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_enrichment_tags_authenticated_read"
  ON item_enrichment_tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "regulatory_item_substances_authenticated_read"
  ON regulatory_item_substances FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_citations_authenticated_read"
  ON item_citations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_chunks_authenticated_read"
  ON item_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "item_relations_authenticated_read"
  ON item_relations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "enforcement_details_authenticated_read"
  ON enforcement_details FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "trend_signals_authenticated_read"
  ON trend_signals FOR SELECT
  USING (auth.role() = 'authenticated');
