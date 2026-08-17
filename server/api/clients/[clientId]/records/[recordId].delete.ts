import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../utils/clients'
import { getSupabaseAdmin } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  const { user } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('client_records')
    .select('id, section, title')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  const { error } = await supabase
    .from('client_records')
    .delete()
    .eq('id', recordId)
    .eq('client_id', clientId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete record' })
  }

  await logClientActivity(clientId, user.id, `${existing.section}_deleted`, { title: existing.title })

  return { success: true }
})
