-- Allow deleting users while keeping historical records (created_by, audit actor, etc.)
ALTER TABLE vaults
  DROP CONSTRAINT IF EXISTS vaults_created_by_fkey,
  ADD CONSTRAINT vaults_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vault_items
  DROP CONSTRAINT IF EXISTS vault_items_created_by_fkey,
  ADD CONSTRAINT vault_items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vault_permissions
  DROP CONSTRAINT IF EXISTS vault_permissions_granted_by_fkey,
  ADD CONSTRAINT vault_permissions_granted_by_fkey
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_created_by_fkey,
  ADD CONSTRAINT clients_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
