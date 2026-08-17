-- Speed up org-wide section queries (assets, projects, etc.)
CREATE INDEX IF NOT EXISTS idx_client_records_section ON client_records(section);
