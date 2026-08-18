-- Enable RLS on tables that were missing it (defense-in-depth; app uses service role).
-- No policies needed: anon/authenticated get no access; service role bypasses RLS.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
