import { randomUUID } from 'node:crypto'
import { FILE_MAX_BYTES } from '../../../../../utils/file-limits'
import { CLIENT_FOLDER_UPLOAD_MAX, fileNameFromRelativePath, sanitizeRelativePath } from '../../../../../utils/file-path'
import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients } from '../../../../utils/clients'
import {
  createClientFileUploadUrl,
  isBlockedFilename,
  sanitizeFilename,
} from '../../../../utils/client-files'

interface UploadRequest {
  filename?: string
  mime?: string
  size?: number
  relativePath?: string
}

function prepareUpload(req: UploadRequest, orgId: string, clientId: string) {
  const relativePath = sanitizeRelativePath(
    typeof req.relativePath === 'string' ? req.relativePath : '',
  )
  const filename = fileNameFromRelativePath(
    relativePath || (typeof req.filename === 'string' ? sanitizeFilename(req.filename) : 'file'),
    typeof req.filename === 'string' ? sanitizeFilename(req.filename) : 'file',
  )
  const mime = typeof req.mime === 'string' ? req.mime.trim() : 'application/octet-stream'
  const size = typeof req.size === 'number' ? req.size : Number(req.size)

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

  return {
    fileId,
    filename,
    mime,
    size,
    relativePath: relativePath || filename,
    signed: createClientFileUploadUrl(orgId, clientId, fileId),
  }
}

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const batch = Array.isArray(body?.files) ? body.files as UploadRequest[] : null
  const requests: UploadRequest[] = batch ?? [{
    filename: body?.filename,
    mime: body?.mime,
    size: body?.size,
    relativePath: body?.relativePath,
  }]

  if (requests.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files requested' })
  }

  if (requests.length > CLIENT_FOLDER_UPLOAD_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Cannot upload more than ${CLIENT_FOLDER_UPLOAD_MAX} files at once`,
    })
  }

  const prepared = await Promise.all(
    requests.map(req => prepareUpload(req, client.org_id, clientId)),
  )

  const uploads = await Promise.all(prepared.map(async (entry) => {
    const signed = await entry.signed
    return {
      fileId: entry.fileId,
      signedUrl: signed.signedUrl,
      token: signed.token,
      path: signed.path,
      filename: entry.filename,
      mime: entry.mime,
      relativePath: entry.relativePath,
    }
  }))

  if (batch) {
    return { uploads }
  }

  return uploads[0]
})
