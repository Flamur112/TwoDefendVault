-- Private bucket for markdown document images (served via authenticated API proxy)
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-images', 'document-images', false)
ON CONFLICT (id) DO NOTHING;
