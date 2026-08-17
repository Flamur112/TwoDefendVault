import { mapClient, requireClientInOrg } from '../../../utils/client-map'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { client } = await requireClientInOrg(event, clientId)

  return { client: mapClient(client) }
})
