export interface AuditLogRecord {
  id: string
  orgId: string | null
  userId: string | null
  userEmail: string | null
  userDisplayName: string | null
  action: string
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  metadata: Record<string, unknown> | null
  createdAt: string
}

export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'vault.open',
  'vault.delete',
  'vault_item.view',
  'vault_item.create',
  'vault_item.update',
  'vault_item.delete',
  'user.create',
  'user.update',
  'user.deactivate',
] as const

export type AuditAction = typeof AUDIT_ACTIONS[number]

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Login',
  'auth.login_failed': 'Login failed',
  'auth.logout': 'Logout',
  'vault.open': 'Vault opened',
  'vault.delete': 'Vault deleted',
  'vault_item.view': 'Credential viewed',
  'vault_item.create': 'Credential created',
  'vault_item.update': 'Credential updated',
  'vault_item.delete': 'Credential deleted',
  'user.create': 'User created',
  'user.update': 'User updated',
  'user.deactivate': 'User deactivated',
}
