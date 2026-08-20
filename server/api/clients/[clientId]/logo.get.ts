import { requireClientInOrg } from '../../../utils/client-map'
import { downloadClientLogo } from '../../../utils/client-logos'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { client } = await requireClientInOrg(event, clientId)
  const logo = await downloadClientLogo(client.org_id, clientId)

  if (!logo) {
    throw createError({ statusCode: 404, statusMessage: 'Logo not found' })
  }

  setHeader(event, 'Content-Type', logo.contentType)
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  if (client.updated_at) {
    setHeader(event, 'ETag', `"${client.updated_at}"`)
  }

  return logo.buffer
})
