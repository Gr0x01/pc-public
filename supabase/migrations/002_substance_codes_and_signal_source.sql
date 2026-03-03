-- substance_codes: captures GSRS code data for cross-reference inference
CREATE TABLE substance_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substance_id UUID NOT NULL REFERENCES substances(id) ON DELETE CASCADE,
  code_system TEXT NOT NULL,
  code_value TEXT NOT NULL,
  code_type TEXT,
  is_classification BOOLEAN DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_substance_codes UNIQUE (substance_id, code_system, code_value)
);

CREATE INDEX idx_substance_codes_substance ON substance_codes (substance_id);
CREATE INDEX idx_substance_codes_system ON substance_codes (code_system);

-- signal_source on segment_impacts: distinguishes direct extraction from cross-reference inference
ALTER TABLE segment_impacts
  ADD COLUMN signal_source TEXT NOT NULL DEFAULT 'direct'
  CHECK (signal_source IN ('direct', 'cross_reference'));

-- signal_source on item_enrichment_tags: same distinction
ALTER TABLE item_enrichment_tags
  ADD COLUMN signal_source TEXT NOT NULL DEFAULT 'direct'
  CHECK (signal_source IN ('direct', 'cross_reference'));

-- Enable RLS on substance_codes (consistent with other tables)
ALTER TABLE substance_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (same pattern as other pipeline tables)
CREATE POLICY "Service role full access" ON substance_codes
  FOR ALL USING (true) WITH CHECK (true);
