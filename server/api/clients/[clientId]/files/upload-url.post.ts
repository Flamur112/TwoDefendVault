import { randomUUID } from 'node:crypto'
import { FILE_MAX_BYTES } from '../../../../../utils/file-limits'
import { CLIENT_FOLDER_UPLOAD_MAX, fileNameFromRelativePath, sanitizeRelativePath } from '../../../../../utils/file-path'
import { isBlockedFilename } from '../../../../../utils/file-validation'
import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients } from '../../../../utils/clients'
import { createClientFileUploadUrl, sanitizeFilename } from '../../../../utils/client-files'

interface UploadRequest {
  clientIndex?: number
  filename?: string
  mime?: string
  size?: number
  relativePath?: string
}

interface PreparedUpload {
  clientIndex: number
  fileId: string
  filename: string
  mime: string
  size: number
  relativePath: string
  signed: ReturnType<typeof createClientFileUploadUrl>
}

function prepareUpload(req: UploadRequest, orgId: string, clientId: string): PreparedUpload {
  const clientIndex = typeof req.clientIndex === 'number' ? req.clientIndex : 0
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
    throw createError({ statusCode: 400, statusMessage: `Invalid file size for ${filename}` })
  }

  if (size > FILE_MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `${filename} must be under ${FILE_MAX_BYTES / (1024 * 1024)} MB`,
    })
  }

  if (isBlockedFilename(filename)) {
    throw createError({ statusCode: 400, statusMessage: `${filename}: file type not allowed` })
  }

  const fileId = randomUUID()
  const storedPath = relativePath || filename

  return {
    clientIndex,
    fileId,
    filename,
    mime,
    size,
    relativePath: storedPath,
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
    clientIndex: 0,
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

  const prepared: PreparedUpload[] = []
  const skipped: Array<{ clientIndex: number, filename: string, reason: string }> = []

  for (const req of requests) {
    try {
      prepared.push(prepareUpload(req, client.org_id, clientId))
    }
    catch (error) {
      skipped.push({
        clientIndex: typeof req.clientIndex === 'number' ? req.clientIndex : prepared.length,
        filename: typeof req.filename === 'string' ? req.filename : 'file',
        reason: error instanceof Error && 'statusMessage' in error
          ? String((error as { statusMessage?: string }).statusMessage)
          : 'Invalid file',
      })
    }
  }

  if (prepared.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: skipped[0]?.reason ?? 'No valid files to upload',
    })
  }

  const uploads = await Promise.all(prepared.map(async (entry) => {
    const signed = await entry.signed
    return {
      clientIndex: entry.clientIndex,
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
    return { uploads, skipped }
  }

  return uploads[0]
})
