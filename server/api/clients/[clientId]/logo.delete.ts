import { mapClient, requireClientInOrg } from '../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../utils/clients'
import { isClientFavorite } from '../../../utils/client-favorites'
import { deleteClientLogoFiles } from '../../../utils/client-logos'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await deleteClientLogoFiles(client.org_id, clientId)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('clients')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to remove logo' })
  }

  await logClientActivity(clientId, user.id, 'edited', { fields: ['logo_url'] })

  const isFavorite = await isClientFavorite(user.id, clientId)
  return { client: mapClient(data, { isFavorite }) }
})
