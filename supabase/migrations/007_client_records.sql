-- Client section records (documents, assets, files, locations, licenses, projects)
CREATE TABLE client_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section     TEXT NOT NULL CHECK (section IN (
    'documents', 'assets', 'files', 'locations', 'licenses', 'projects'
  )),
  title       TEXT NOT NULL,
  notes       TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_records_client_section ON client_records(client_id, section);
CREATE INDEX idx_client_records_title ON client_records(client_id, title);

ALTER TABLE client_records ENABLE ROW LEVEL SECURITY;
