-- Add dedicated column for linking campaigns to regulatory items (alert dedup).
-- Replaces the fragile pattern of storing item UUIDs in html_content.
-- Applied via Supabase MCP 2026-03-19. This file captures the migration for version control.

ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS reference_item_id UUID REFERENCES regulatory_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_reference_item
  ON email_campaigns (reference_item_id)
  WHERE reference_item_id IS NOT NULL;
