import { requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { activityCutoffIso } from '../../../../utils/retention'
import {
  ACTIVITY_DEFAULT_LIMIT,
  type ActivityFilter,
  matchesActivityFilter,
} from '~/utils/client-activity'

function parseLimit(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return ACTIVITY_DEFAULT_LIMIT
  return Math.min(n, 100)
}

function parseFilter(value: unknown): ActivityFilter {
  if (value === 'credentials' || value === 'documents') return value
  return 'all'
}

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  await requireClientInOrg(event, clientId)

  const query = getQuery(event)
  const limit = parseLimit(query.limit)
  const filter = parseFilter(query.filter)

  const supabase = getSupabaseAdmin()
  const fetchLimit = filter === 'all' ? limit : Math.min(limit * 3, 100)

  const { data, error } = await supabase
    .from('client_activity')
    .select('id, action, metadata, created_at, user_id, users(display_name, email)')
    .eq('client_id', clientId)
    .gte('created_at', activityCutoffIso())
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load activity' })
  }

  const activity = (data ?? [])
    .filter(row => matchesActivityFilter(row.action, filter))
    .slice(0, limit)
    .map(row => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at,
      userName: (row.users as { display_name?: string, email?: string } | null)?.display_name
        ?? (row.users as { email?: string } | null)?.email
        ?? 'System',
    }))

  return { activity }
})
