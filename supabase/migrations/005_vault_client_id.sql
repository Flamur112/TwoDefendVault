-- Link vaults to clients
ALTER TABLE vaults
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vaults_client_id ON vaults(client_id);
