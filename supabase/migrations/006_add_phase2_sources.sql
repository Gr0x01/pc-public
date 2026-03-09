-- Phase 2 FDA data sources
INSERT INTO sources (name, source_type, base_url) VALUES
  ('import_alerts',      'scrape', 'https://www.accessdata.fda.gov/cms_ia/'),
  ('guidance_documents', 'scrape', 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents'),
  ('regulations_gov',    'api',    'https://api.regulations.gov/v4/')
ON CONFLICT (name) DO NOTHING;
