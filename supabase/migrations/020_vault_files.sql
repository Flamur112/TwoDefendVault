-- Vault file storage (folders of files linked to credential vaults)

CREATE TABLE vault_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id      UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  relative_path TEXT NOT NULL DEFAULT '',
  mime          TEXT NOT NULL DEFAULT 'application/octet-stream',
  size          BIGINT NOT NULL CHECK (size > 0),
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_files_vault_id ON vault_files(vault_id);
CREATE INDEX idx_vault_files_relative_path ON vault_files(vault_id, relative_path);

ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;
