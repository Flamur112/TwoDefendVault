import { randomUUID } from 'node:crypto'
import { FILE_MAX_BYTES } from '../../../../../utils/file-limits'
import { requireVaultAccess } from '../../../../utils/authorize'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import {
  createVaultFileUploadUrl,
  fileNameFromRelativePath,
  sanitizeRelativePath,
  validateVaultFileInput,
  VAULT_FILES_MAX,
  VAULT_FOLDER_UPLOAD_MAX,
} from '../../../../utils/vault-files'
import { sanitizeFilename } from '../../../../utils/client-files'

interface UploadRequest {
  clientIndex?: number
  filename?: string
  mime?: string
  size?: number
  relativePath?: string
}

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })

  const user = await requireVaultAccess(event, vaultId, 'write')
  const body = await readBody(event)

  const supabase = getSupabaseAdmin()
  const { count } = await supabase
    .from('vault_files')
    .select('id', { count: 'exact', head: true })
    .eq('vault_id', vaultId)

  const existingCount = count ?? 0

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

  if (requests.length > VAULT_FOLDER_UPLOAD_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Cannot upload more than ${VAULT_FOLDER_UPLOAD_MAX} files at once`,
    })
  }

  if (existingCount + requests.length > VAULT_FILES_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Vault file limit is ${VAULT_FILES_MAX}`,
    })
  }

  const prepared: Array<{
    clientIndex: number
    fileId: string
    filename: string
    mime: string
    relativePath: string
    signed: ReturnType<typeof createVaultFileUploadUrl>
  }> = []
  const skipped: Array<{ clientIndex: number, filename: string, reason: string }> = []

  for (const req of requests) {
    try {
      const relativePath = sanitizeRelativePath(
        typeof req.relativePath === 'string' ? req.relativePath : '',
      )
      const filename = fileNameFromRelativePath(
        relativePath,
        typeof req.filename === 'string' ? sanitizeFilename(req.filename) : 'file',
      )
      const mime = typeof req.mime === 'string' ? req.mime.trim() : 'application/octet-stream'
      const size = typeof req.size === 'number' ? req.size : Number(req.size)

      validateVaultFileInput(filename, size, FILE_MAX_BYTES)

      const fileId = randomUUID()
      prepared.push({
        clientIndex: typeof req.clientIndex === 'number' ? req.clientIndex : prepared.length,
        fileId,
        filename,
        mime,
        relativePath: relativePath || filename,
        signed: createVaultFileUploadUrl(user.orgId, vaultId, fileId),
      })
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
