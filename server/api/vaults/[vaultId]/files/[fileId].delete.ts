import { requireVaultAccess } from '../../../../utils/authorize'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import {
  deleteVaultFilesFromStorage,
  mapVaultFileRow,
} from '../../../../utils/vault-files'
import { isValidClientFileId } from '../../../../utils/client-files'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  const fileId = getRouterParam(event, 'fileId')
  if (!vaultId || !fileId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID and file ID required' })
  }
  if (!isValidClientFileId(fileId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file ID' })
  }

  const user = await requireVaultAccess(event, vaultId, 'write')

  const supabase = getSupabaseAdmin()
  const { data: file } = await supabase
    .from('vault_files')
    .select('id, vault_id, name, relative_path, mime, size, uploaded_at')
    .eq('id', fileId)
    .eq('vault_id', vaultId)
    .maybeSingle()

  if (!file) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  await deleteVaultFilesFromStorage(user.orgId, vaultId, [fileId])

  const { error } = await supabase
    .from('vault_files')
    .delete()
    .eq('id', fileId)
    .eq('vault_id', vaultId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete file' })
  }

  return { success: true, file: mapVaultFileRow(file) }
})
