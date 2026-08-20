import type { H3Event } from 'h3'
import type { SessionUser } from './session'
import { AUDIT_RETENTION_DAYS } from './retention-purge'
import { getSupabaseAdmin } from './supabase'

export { AUDIT_RETENTION_DAYS }

const SENSITIVE_KEY = /password|secret|token|encrypted|credential|totp|key/i

export interface AuditLogInput {
  orgId?: string | null
  userId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  success?: boolean
  metadata?: Record<string, unknown> | null
}

export function getAuditContext(event: H3Event) {
  return {
    ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
    userAgent: getHeader(event, 'user-agent') ?? null,
  }
}

export function sanitizeAuditMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) return null

  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue
    if (typeof value === 'string' && value.length > 500) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value
    }
  }

  return Object.keys(clean).length ? clean : null
}

export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('audit_logs').insert({
    org_id: entry.orgId ?? null,
    user_id: entry.userId ?? null,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    success: entry.success ?? true,
    metadata: sanitizeAuditMetadata(entry.metadata),
  })

  if (error) {
    console.error('[audit] failed to write log:', error.message)
  }
}

export async function auditFromEvent(
  event: H3Event,
  entry: Omit<AuditLogInput, 'ipAddress' | 'userAgent'> & { user?: SessionUser | null },
): Promise<void> {
  const ctx = getAuditContext(event)
  await writeAuditLog({
    orgId: entry.orgId ?? entry.user?.orgId ?? null,
    userId: entry.userId ?? entry.user?.id ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    success: entry.success,
    metadata: entry.metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  })
}

export function mapAuditLogRow(row: {
  id: string
  org_id: string | null
  user_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  ip_address: string | null
  user_agent: string | null
  success: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  users?: { email: string, display_name: string | null } | { email: string, display_name: string | null }[] | null
}) {
  const user = Array.isArray(row.users) ? row.users[0] : row.users
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    userEmail: user?.email ?? null,
    userDisplayName: user?.display_name ?? null,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: null as string | null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}

export async function enrichAuditLogs<T extends ReturnType<typeof mapAuditLogRow>>(
  logs: T[],
): Promise<T[]> {
  if (logs.length === 0) return logs

  const userIds = new Set<string>()
  const vaultIds = new Set<string>()

  for (const log of logs) {
    if (log.targetType === 'user' && log.targetId) userIds.add(log.targetId)
    if (log.targetType === 'vault' && log.targetId) vaultIds.add(log.targetId)
  }

  const supabase = getSupabaseAdmin()
  const userMap = new Map<string, string>()
  const vaultMap = new Map<string, string>()

  if (userIds.size > 0) {
    const { data } = await supabase
      .from('users')
      .select('id, email, display_name')
      .in('id', [...userIds])
    for (const u of data ?? []) {
      userMap.set(u.id, u.display_name?.trim() || u.email)
    }
  }

  if (vaultIds.size > 0) {
    const { data } = await supabase
      .from('vaults')
      .select('id, name')
      .in('id', [...vaultIds])
    for (const v of data ?? []) {
      vaultMap.set(v.id, v.name)
    }
  }

  return logs.map((log) => {
    let targetLabel: string | null = null

    if (log.targetType === 'user' && log.targetId) {
      targetLabel = userMap.get(log.targetId) ?? (typeof log.metadata?.email === 'string' ? log.metadata.email : null)
    }
    else if (log.targetType === 'vault') {
      targetLabel = (log.targetId ? vaultMap.get(log.targetId) : null)
        ?? (typeof log.metadata?.name === 'string' ? log.metadata.name : null)
    }
    else if (log.targetType === 'vault_item' && typeof log.metadata?.name === 'string') {
      targetLabel = log.metadata.name
    }

    return { ...log, targetLabel }
  })
}
