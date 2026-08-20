-- Track last successful sign-in on users (cheap reads for admin user list)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Backfill from existing successful login audit events
UPDATE users u
SET
  last_login_at = sub.created_at,
  last_login_ip = sub.ip_address
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    created_at,
    ip_address
  FROM audit_logs
  WHERE action = 'auth.login'
    AND success = TRUE
    AND user_id IS NOT NULL
  ORDER BY user_id, created_at DESC
) sub
WHERE u.id = sub.user_id;

-- Single-tenant fix: attach org to older auth events missing org_id
UPDATE audit_logs al
SET org_id = o.id
FROM organizations o
WHERE al.org_id IS NULL
  AND o.slug = 'twodefend'
  AND al.action IN ('auth.login', 'auth.login_failed', 'auth.logout');

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action_created
  ON audit_logs(org_id, action, created_at DESC);
