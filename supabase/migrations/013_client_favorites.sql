-- Per-user client favorites (replaces org-wide clients.is_favorite)

CREATE TABLE client_favorites (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, client_id)
);

CREATE INDEX idx_client_favorites_user_id ON client_favorites(user_id);
CREATE INDEX idx_client_favorites_client_id ON client_favorites(client_id);

-- Copy existing org-wide stars to each user in the org
INSERT INTO client_favorites (user_id, client_id)
SELECT u.id, c.id
FROM clients c
JOIN users u ON u.org_id = c.org_id
WHERE c.is_favorite = TRUE
ON CONFLICT DO NOTHING;

ALTER TABLE client_favorites ENABLE ROW LEVEL SECURITY;
