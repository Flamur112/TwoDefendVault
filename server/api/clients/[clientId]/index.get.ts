import { mapClient, requireClientInOrg } from '../../../utils/client-map'
import { isClientFavorite } from '../../../utils/client-favorites'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  const isFavorite = await isClientFavorite(user.id, clientId)

  return { client: mapClient(client, { isFavorite }) }
})
