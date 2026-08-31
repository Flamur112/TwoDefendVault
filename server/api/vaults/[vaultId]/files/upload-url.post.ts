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

  const uploads = await Promise.all(requests.map(async (req) => {
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
    const signed = await createVaultFileUploadUrl(user.orgId, vaultId, fileId)

    return {
      fileId,
      signedUrl: signed.signedUrl,
      token: signed.token,
      path: signed.path,
      filename,
      mime,
      relativePath,
    }
  }))

  if (batch) {
    return { uploads }
  }

  return uploads[0]
})
