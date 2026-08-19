import { randomUUID } from 'node:crypto'
import { FILE_MAX_BYTES } from '../../../../../utils/file-limits'
import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients } from '../../../../utils/clients'
import {
  createClientFileUploadUrl,
  isBlockedFilename,
  sanitizeFilename,
} from '../../../../utils/client-files'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const filename = typeof body?.filename === 'string' ? sanitizeFilename(body.filename) : 'file'
  const mime = typeof body?.mime === 'string' ? body.mime.trim() : 'application/octet-stream'
  const size = typeof body?.size === 'number' ? body.size : Number(body?.size)

  if (!Number.isFinite(size) || size <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file size' })
  }

  if (size > FILE_MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `File must be under ${FILE_MAX_BYTES / (1024 * 1024)} MB`,
    })
  }

  if (isBlockedFilename(filename)) {
    throw createError({ statusCode: 400, statusMessage: 'This file type is not allowed' })
  }

  const fileId = randomUUID()
  const signed = await createClientFileUploadUrl(client.org_id, clientId, fileId)

  return {
    fileId,
    signedUrl: signed.signedUrl,
    token: signed.token,
    path: signed.path,
    filename,
    mime,
  }
})
