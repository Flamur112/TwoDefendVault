CREATE INDEX IF NOT EXISTS idx_vault_items_vault_id ON vault_items(vault_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
