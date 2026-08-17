-- Faster activity queries scoped to client + date range
CREATE INDEX IF NOT EXISTS idx_client_activity_client_created
  ON client_activity(client_id, created_at DESC);
