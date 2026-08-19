-- Client file attachments (PDFs, docs, etc.) — served via signed URLs, not proxied through app server

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;
