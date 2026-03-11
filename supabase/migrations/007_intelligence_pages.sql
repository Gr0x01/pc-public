-- =============================================================================
-- Migration 007: Intelligence Pages
--
-- Three programmatic SEO surfaces: /ingredients/, /enforcement/, /regulations/
-- Single table with page_type enum, cross-reference links, and regulatory item links.
-- Public read for published pages (SEO), writes via service role only.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- intelligence_pages: single table, page_type differentiates surfaces
-- ---------------------------------------------------------------------------

CREATE TABLE intelligence_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL CHECK (page_type IN ('ingredient', 'enforcement', 'regulation')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  structured_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'needs_refresh')),
  seo_title TEXT,
  seo_description TEXT,
  cover_image_url TEXT,
  word_count INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  refresh_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_intelligence_pages_type_slug UNIQUE (page_type, slug)
);

CREATE TRIGGER set_intelligence_pages_updated_at
  BEFORE UPDATE ON intelligence_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_intelligence_pages_type_status ON intelligence_pages (page_type, status);
CREATE INDEX idx_intelligence_pages_slug ON intelligence_pages (slug);
CREATE INDEX idx_intelligence_pages_published ON intelligence_pages (published_at DESC) WHERE status = 'published';
CREATE INDEX idx_intelligence_pages_structured_data ON intelligence_pages USING GIN (structured_data);


-- ---------------------------------------------------------------------------
-- intelligence_page_links: cross-references between pages
-- ---------------------------------------------------------------------------

CREATE TABLE intelligence_page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID NOT NULL REFERENCES intelligence_pages(id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES intelligence_pages(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN (
    'ingredient_in_enforcement',
    'enforcement_of_regulation',
    'regulation_affects_ingredient',
    'related'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_links UNIQUE (source_page_id, target_page_id, link_type)
);

CREATE INDEX idx_page_links_source ON intelligence_page_links (source_page_id);
CREATE INDEX idx_page_links_target ON intelligence_page_links (target_page_id);


-- ---------------------------------------------------------------------------
-- intelligence_page_items: links pages to source regulatory_items
-- ---------------------------------------------------------------------------

CREATE TABLE intelligence_page_items (
  page_id UUID NOT NULL REFERENCES intelligence_pages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  relevance TEXT NOT NULL DEFAULT 'supporting' CHECK (relevance IN ('primary', 'supporting', 'mentioned')),
  PRIMARY KEY (page_id, item_id)
);

CREATE INDEX idx_page_items_item ON intelligence_page_items (item_id);


-- ---------------------------------------------------------------------------
-- RLS: Public read for published pages (SEO). Writes via service role.
-- ---------------------------------------------------------------------------

ALTER TABLE intelligence_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_page_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_page_items ENABLE ROW LEVEL SECURITY;

-- Public read for published pages (no auth needed for SEO)
CREATE POLICY "intelligence_pages_public_read" ON intelligence_pages
  FOR SELECT USING (status = 'published');

-- Links and items are readable if the page is published
CREATE POLICY "intelligence_page_links_public_read" ON intelligence_page_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM intelligence_pages WHERE id = source_page_id AND status = 'published')
  );

CREATE POLICY "intelligence_page_items_public_read" ON intelligence_page_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM intelligence_pages WHERE id = page_id AND status = 'published')
  );
