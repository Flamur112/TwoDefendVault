import { requireClientInOrg } from '../../../../../utils/client-map'
import { logClientActivity } from '../../../../../utils/clients'
import { getSupabaseAdmin } from '../../../../../utils/supabase'

const VIEW_COOLDOWN_MS = 30 * 60 * 1000

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  const { user } = await requireClientInOrg(event, clientId)

  const supabase = getSupabaseAdmin()
  const { data: record, error: recordError } = await supabase
    .from('client_records')
    .select('id, title, section')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (recordError || !record) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  if (record.section !== 'documents') {
    throw createError({ statusCode: 400, statusMessage: 'Not a document record' })
  }

  const cutoff = new Date(Date.now() - VIEW_COOLDOWN_MS).toISOString()
  const { data: recentViews } = await supabase
    .from('client_activity')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .eq('action', 'documents_viewed')
    .gte('created_at', cutoff)
    .filter('metadata->>recordId', 'eq', recordId)
    .limit(1)

  if (!recentViews?.length) {
    await logClientActivity(clientId, user.id, 'documents_viewed', {
      recordId,
      title: record.title,
    })
  }

  return { logged: !recentViews?.length }
})
