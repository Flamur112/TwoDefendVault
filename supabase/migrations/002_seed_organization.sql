-- Seed TwoDefend organization (Phase 3)
INSERT INTO organizations (name, slug)
VALUES ('TwoDefend', 'twodefend')
ON CONFLICT (slug) DO NOTHING;
