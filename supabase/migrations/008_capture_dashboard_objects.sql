-- Capture schema objects that were applied via Supabase Dashboard.
-- This migration is idempotent — all statements use IF NOT EXISTS or CREATE OR REPLACE.
-- Purpose: version-control for reproducibility (staging, rebuilds, onboarding).

-- =========================================================================
-- Tables
-- =========================================================================

CREATE TABLE IF NOT EXISTS product_match_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES regulatory_items(id),
  product_id UUID NOT NULL REFERENCES subscriber_products(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  relevant BOOLEAN NOT NULL,
  reasoning TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  UNIQUE (item_id, product_id)
);

ALTER TABLE product_match_verdicts ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own verdicts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_match_verdicts' AND policyname = 'Users can read own verdicts'
  ) THEN
    CREATE POLICY "Users can read own verdicts"
      ON product_match_verdicts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS weekly_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  week_end DATE NOT NULL,
  narrative TEXT NOT NULL,
  sector_counts JSONB NOT NULL DEFAULT '{}',
  total_items INTEGER NOT NULL DEFAULT 0,
  total_sectors INTEGER NOT NULL DEFAULT 0,
  total_substances_flagged INTEGER NOT NULL DEFAULT 0,
  total_deadlines INTEGER NOT NULL DEFAULT 0,
  showcase_items JSONB NOT NULL DEFAULT '[]',
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled, no SELECT policy = service-role only access
ALTER TABLE weekly_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- RPC Functions
-- =========================================================================

CREATE OR REPLACE FUNCTION public.find_substance_by_name(query_name text)
RETURNS TABLE(substance_id uuid, similarity_score real)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  -- Fast path: exact case-insensitive match
  RETURN QUERY
  SELECT sn.substance_id, 1.0::REAL AS similarity_score
  FROM substance_names sn
  WHERE lower(sn.name) = lower(query_name)
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fuzzy match via pg_trgm
  RETURN QUERY
  SELECT sn.substance_id, similarity(lower(sn.name), lower(query_name))::REAL AS similarity_score
  FROM substance_names sn
  WHERE sn.name % query_name
  ORDER BY similarity(lower(sn.name), lower(query_name)) DESC
  LIMIT 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_substance_matches(p_user_id uuid, p_since date DEFAULT NULL)
RETURNS TABLE(
  item_id uuid, title text, item_type text, published_date date, source_url text,
  product_id uuid, product_name text, ingredient_name text, substance_id uuid,
  summary text, regulatory_action_type text, deadline date, substance_item_count bigint
)
LANGUAGE sql STABLE
AS $function$
  WITH user_substances AS (
    SELECT DISTINCT pi.substance_id
    FROM product_ingredients pi
    JOIN subscriber_products sp ON pi.product_id = sp.id
    WHERE sp.user_id = p_user_id
      AND sp.is_active = true
      AND pi.substance_id IS NOT NULL
  ),
  substance_frequency AS (
    SELECT rs.substance_id, COUNT(DISTINCT rs.regulatory_item_id) AS item_count
    FROM regulatory_item_substances rs
    WHERE rs.substance_id IN (SELECT substance_id FROM user_substances)
    GROUP BY rs.substance_id
  )
  SELECT
    ri.id AS item_id, ri.title, ri.item_type, ri.published_date, ri.source_url,
    sp.id AS product_id, sp.name AS product_name,
    pi.name AS ingredient_name, ris.substance_id,
    ie.summary, ie.regulatory_action_type, ie.deadline,
    COALESCE(sf.item_count, 1) AS substance_item_count
  FROM regulatory_item_substances ris
  JOIN product_ingredients pi ON ris.substance_id = pi.substance_id
  JOIN subscriber_products sp ON pi.product_id = sp.id
  JOIN regulatory_items ri ON ri.id = ris.regulatory_item_id
  LEFT JOIN item_enrichments ie ON ie.item_id = ri.id
  LEFT JOIN substance_frequency sf ON sf.substance_id = ris.substance_id
  WHERE sp.user_id = p_user_id
    AND sp.is_active = true
    AND ris.substance_id IS NOT NULL
    AND (p_since IS NULL OR ri.published_date >= p_since)
  ORDER BY ri.published_date DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_category_matches(p_user_id uuid, p_since date DEFAULT NULL)
RETURNS TABLE(
  item_id uuid, title text, item_type text, published_date date, source_url text,
  product_id uuid, product_name text, category_slug text, category_label text,
  summary text, regulatory_action_type text, deadline date
)
LANGUAGE sql STABLE
AS $function$
  SELECT
    ri.id AS item_id, ri.title, ri.item_type, ri.published_date, ri.source_url,
    sp.id AS product_id, sp.name AS product_name,
    pc.slug AS category_slug, pc.label AS category_label,
    ie.summary, ie.regulatory_action_type, ie.deadline
  FROM item_enrichment_tags iet
  JOIN product_categories pc ON iet.tag_value = pc.slug
  JOIN subscriber_products sp ON sp.product_category_id = pc.id
  JOIN regulatory_items ri ON ri.id = iet.item_id
  LEFT JOIN item_enrichments ie ON ie.item_id = ri.id
  WHERE iet.tag_dimension = 'product_type'
    AND sp.user_id = p_user_id
    AND sp.is_active = true
    AND (p_since IS NULL OR ri.published_date >= p_since)
  ORDER BY ri.published_date DESC;
$function$;

CREATE OR REPLACE FUNCTION public.check_urgent_matches(p_item_id uuid)
RETURNS TABLE(user_id uuid, product_id uuid, product_name text, ingredient_name text, substance_id uuid)
LANGUAGE sql STABLE
AS $function$
  SELECT
    sp.user_id, sp.id AS product_id, sp.name AS product_name,
    pi.name AS ingredient_name, ris.substance_id
  FROM regulatory_item_substances ris
  JOIN product_ingredients pi ON ris.substance_id = pi.substance_id
  JOIN subscriber_products sp ON pi.product_id = sp.id
  WHERE ris.regulatory_item_id = p_item_id
    AND sp.is_active = true
    AND ris.substance_id IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.get_live_verdict_counts(p_user_id uuid)
RETURNS TABLE(product_id uuid, total bigint, urgent bigint, watching bigint)
LANGUAGE sql STABLE
AS $function$
  WITH live_verdicts AS (
    SELECT v.product_id, v.resolution, ri.item_type, ie.deadline
    FROM product_match_verdicts v
    JOIN regulatory_items ri ON ri.id = v.item_id
    LEFT JOIN item_enrichments ie ON ie.item_id = ri.id
    WHERE v.user_id = p_user_id
      AND v.relevant = true
      AND (v.resolution IS NULL OR v.resolution = 'watching')
      AND (
        (ie.deadline IS NOT NULL AND ie.deadline > (current_date - interval '30 days'))
        OR
        (ie.deadline IS NULL AND (
          (ri.item_type IN ('recall', 'safety_alert', 'import_alert')
            AND ri.published_date > (current_date - interval '90 days'))
          OR
          (ri.item_type IN ('warning_letter', '483_observation')
            AND ri.published_date > (current_date - interval '60 days'))
          OR
          (ri.item_type NOT IN ('recall', 'safety_alert', 'import_alert', 'warning_letter', '483_observation')
            AND ri.published_date > (current_date - interval '30 days'))
        ))
      )
  )
  SELECT
    lv.product_id,
    count(*)::bigint AS total,
    count(*) FILTER (
      WHERE lv.deadline IS NOT NULL
        AND lv.deadline <= (current_date + interval '90 days')
        AND lv.deadline > current_date
        AND lv.resolution IS DISTINCT FROM 'watching'
    )::bigint AS urgent,
    count(*) FILTER (
      WHERE lv.resolution = 'watching'
    )::bigint AS watching
  FROM live_verdicts lv
  GROUP BY lv.product_id;
$function$;

CREATE OR REPLACE FUNCTION public.replace_product_ingredients(p_product_id uuid, p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  inserted_count integer;
BEGIN
  DELETE FROM product_ingredients WHERE product_id = p_product_id;

  INSERT INTO product_ingredients (
    product_id, name, normalized_name, substance_id,
    amount, unit, sort_order,
    normalization_status, normalization_confidence, normalization_method,
    source_metadata
  )
  SELECT
    p_product_id,
    (r->>'name'),
    (r->>'normalized_name'),
    (r->>'substance_id')::uuid,
    (r->>'amount'),
    (r->>'unit'),
    (r->>'sort_order')::integer,
    (r->>'normalization_status'),
    (r->>'normalization_confidence')::real,
    (r->>'normalization_method'),
    (r->'source_metadata')::jsonb
  FROM jsonb_array_elements(p_rows) AS r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;
