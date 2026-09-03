import { requireRole } from '../../utils/authorize'
import { mapAuditLogRow } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'

const AUTH_ACTIONS = ['auth.login', 'auth.login_failed'] as const
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const query = getQuery(event)

  let limit = DEFAULT_LIMIT
  if (typeof query.limit === 'string') {
    const parsed = Number.parseInt(query.limit, 10)
    if (!Number.isNaN(parsed)) limit = Math.min(Math.max(parsed, 1), MAX_LIMIT)
  }

  let offset = 0
  if (typeof query.offset === 'string') {
    const parsed = Number.parseInt(query.offset, 10)
    if (!Number.isNaN(parsed)) offset = Math.max(parsed, 0)
  }

  const success = query.success === 'true' ? true : query.success === 'false' ? false : undefined

  const supabase = getSupabaseAdmin()
  let dbQuery = supabase
    .from('audit_logs')
    .select(`
      id,
      org_id,
      user_id,
      action,
      target_type,
      target_id,
      ip_address,
      user_agent,
      success,
      metadata,
      created_at,
      users(email, display_name)
    `, { count: 'exact' })
    .eq('org_id', admin.orgId)
    .in('action', [...AUTH_ACTIONS])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (success !== undefined) dbQuery = dbQuery.eq('success', success)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load sign-in activity' })
  }

  const events = (data ?? []).map((row) => {
    const mapped = mapAuditLogRow(row)
    const email = mapped.userEmail
      ?? (typeof mapped.metadata?.email === 'string' ? mapped.metadata.email : null)

    return {
      id: mapped.id,
      action: mapped.action,
      success: mapped.success,
      email,
      userId: mapped.userId,
      userDisplayName: mapped.userDisplayName,
      ipAddress: mapped.ipAddress,
      userAgent: mapped.userAgent,
      reason: typeof mapped.metadata?.reason === 'string' ? mapped.metadata.reason : null,
      provider: typeof mapped.metadata?.provider === 'string' ? mapped.metadata.provider : null,
      createdAt: mapped.createdAt,
    }
  })

  return {
    events,
    total: count ?? 0,
    limit,
    offset,
  }
})
