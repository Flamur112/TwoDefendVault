import { requireRole } from '../../utils/authorize'
import { enrichAuditLogs, mapAuditLogRow } from '../../utils/audit'
import { AUDIT_RETENTION_DAYS } from '../../../utils/retention'
import { maybeRunRetentionPurge } from '../../utils/retention-purge'
import { getSupabaseAdmin } from '../../utils/supabase'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  maybeRunRetentionPurge()
  const query = getQuery(event)

  const action = typeof query.action === 'string' && query.action.trim() ? query.action.trim() : undefined
  const userId = typeof query.userId === 'string' && query.userId.trim() ? query.userId.trim() : undefined
  const success = query.success === 'true' ? true : query.success === 'false' ? false : undefined
  const from = typeof query.from === 'string' && query.from.trim() ? query.from.trim() : undefined
  const to = typeof query.to === 'string' && query.to.trim() ? query.to.trim() : undefined

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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) dbQuery = dbQuery.eq('action', action)
  if (userId) dbQuery = dbQuery.eq('user_id', userId)
  if (success !== undefined) dbQuery = dbQuery.eq('success', success)
  if (from) dbQuery = dbQuery.gte('created_at', from)
  if (to) dbQuery = dbQuery.lte('created_at', to)

  const { data, error, count } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load audit log' })
  }

  const mapped = (data ?? []).map(row => mapAuditLogRow(row))
  const logs = await enrichAuditLogs(mapped)

  return {
    logs,
    total: count ?? 0,
    limit,
    offset,
    retentionDays: AUDIT_RETENTION_DAYS,
  }
})
