import { requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { activityCutoffIso } from '../../../utils/clients'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  await requireClientInOrg(event, clientId)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_activity')
    .select('id, action, metadata, created_at, user_id, users(display_name, email)')
    .eq('client_id', clientId)
    .gte('created_at', activityCutoffIso())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load activity' })
  }

  return {
    activity: (data ?? []).map(row => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at,
      userName: (row.users as { display_name?: string, email?: string } | null)?.display_name
        ?? (row.users as { email?: string } | null)?.email
        ?? 'System',
    })),
  }
})
