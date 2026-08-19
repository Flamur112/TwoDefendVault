import { requireClientInOrg } from '../../../../../utils/client-map'
import {
  createClientFileDownloadUrl,
  isValidClientFileId,
} from '../../../../../utils/client-files'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const fileId = getRouterParam(event, 'fileId')
  if (!clientId || !fileId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and file ID required' })
  }

  if (!isValidClientFileId(fileId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file ID' })
  }

  const { client } = await requireClientInOrg(event, clientId)
  const query = getQuery(event)
  const downloadName = typeof query.name === 'string' ? query.name : undefined

  const url = await createClientFileDownloadUrl(
    client.org_id,
    clientId,
    fileId,
    downloadName,
  )

  return { url }
})
