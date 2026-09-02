import { requireVaultAccess } from '../../../../utils/authorize'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import {
  mapVaultFileRow,
  validateVaultFileInput,
  VAULT_FILES_MAX,
} from '../../../../utils/vault-files'
import { isValidClientFileId, sanitizeFilename } from '../../../../utils/client-files'
import { FILE_MAX_BYTES } from '../../../../../utils/file-limits'
import { fileNameFromRelativePath, sanitizeRelativePath } from '../../../../../utils/file-path'

interface RegisterEntry {
  fileId?: string
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

  const entries: RegisterEntry[] = Array.isArray(body?.files)
    ? body.files
    : body?.fileId
      ? [body]
      : []

  if (entries.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files to register' })
  }

  const supabase = getSupabaseAdmin()
  const { count } = await supabase
    .from('vault_files')
    .select('id', { count: 'exact', head: true })
    .eq('vault_id', vaultId)

  const existingCount = count ?? 0
  if (existingCount + entries.length > VAULT_FILES_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Vault file limit is ${VAULT_FILES_MAX}`,
    })
  }

  const registered = []

  for (const entry of entries) {
    const fileId = typeof entry.fileId === 'string' ? entry.fileId : ''
    if (!isValidClientFileId(fileId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid file ID' })
    }

    const relativePath = sanitizeRelativePath(
      typeof entry.relativePath === 'string' ? entry.relativePath : '',
    )
    const name = fileNameFromRelativePath(
      relativePath,
      typeof entry.filename === 'string' ? sanitizeFilename(entry.filename) : 'file',
    )
    const mime = typeof entry.mime === 'string' ? entry.mime.trim() : 'application/octet-stream'
    const size = typeof entry.size === 'number' ? entry.size : Number(entry.size)

    validateVaultFileInput(name, size, FILE_MAX_BYTES)

    const { data: row, error } = await supabase
      .from('vault_files')
      .insert({
        id: fileId,
        vault_id: vaultId,
        name,
        relative_path: relativePath,
        mime,
        size,
        uploaded_by: user.id,
      })
      .select('id, vault_id, name, relative_path, mime, size, uploaded_at')
      .single()

    if (error || !row) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to register file' })
    }

    registered.push(mapVaultFileRow(row))
  }

  return { files: registered }
})
