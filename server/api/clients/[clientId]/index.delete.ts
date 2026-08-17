import { requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { canDeleteClients } from '../../../utils/clients'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)
  if (!canDeleteClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single()

  const { error } = await supabase.from('clients').delete().eq('id', clientId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete client' })
  }

  // client_activity cascades on delete; log is moot — activity for delete happens before if needed
  // Vaults get client_id SET NULL via FK

  return { success: true, deleted: { id: clientId, name: client?.name } }
})
