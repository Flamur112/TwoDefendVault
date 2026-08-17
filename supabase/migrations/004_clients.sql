-- Clients (MSP documentation)
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  industry      TEXT,
  website       TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  country       TEXT,
  postal_code   TEXT,
  notes         TEXT,
  logo_url      TEXT,
  onboarded_at  DATE,
  is_favorite   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_activity ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_client_activity_client_id ON client_activity(client_id);
CREATE INDEX idx_client_activity_created_at ON client_activity(created_at DESC);
