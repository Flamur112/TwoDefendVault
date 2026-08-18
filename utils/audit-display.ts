/** Audit logs are kept for this many days (displayed to admins; purge job can use same constant). */
export const AUDIT_RETENTION_DAYS = 365

export const AUDIT_TARGET_TYPE_LABELS: Record<string, string> = {
  user: 'User account',
  vault: 'Vault',
  vault_item: 'Credential',
  client: 'Client',
}

export const AUDIT_METADATA_LABELS: Record<string, string> = {
  provider: 'Sign-in provider',
  reason: 'Reason',
  email: 'Email',
  role: 'Role',
  name: 'Name',
  vaultId: 'Vault ID',
  itemType: 'Credential type',
  changedFields: 'Fields changed',
}

const REASON_LABELS: Record<string, string> = {
  deactivated: 'Account deactivated',
  invalid_state: 'Invalid login state',
  missing_code_or_state: 'Missing OAuth response',
}

const PROVIDER_LABELS: Record<string, string> = {
  zoho: 'Zoho',
}

export function formatAuditMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return ''

  return Object.entries(metadata)
    .map(([key, value]) => {
      const label = AUDIT_METADATA_LABELS[key] ?? key.replace(/_/g, ' ')
      const formatted = formatAuditMetadataValue(key, value)
      return `${label}: ${formatted}`
    })
    .join(', ')
}

function formatAuditMetadataValue(key: string, value: unknown): string {
  const str = String(value)
  if (key === 'provider') return PROVIDER_LABELS[str] ?? str
  if (key === 'reason') return REASON_LABELS[str] ?? str.replace(/_/g, ' ')
  if (key === 'itemType') {
    const labels: Record<string, string> = {
      login: 'Login',
      api_key: 'API key',
      ssh: 'SSH',
      totp: 'TOTP',
      note: 'Note',
      recovery: 'Recovery',
    }
    return labels[str] ?? str
  }
  if (key === 'changedFields') return str.split(',').join(', ')
  return str
}

export function formatAuditTimestamp(iso: string): { local: string, timezone: string } {
  const date = new Date(iso)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const local = date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  return { local, timezone }
}
