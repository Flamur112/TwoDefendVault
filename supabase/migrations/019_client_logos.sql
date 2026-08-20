-- Client logos stored in Supabase (served via authenticated API route)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', false)
ON CONFLICT (id) DO NOTHING;
