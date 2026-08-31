import { requireVaultAccess } from '../../../../utils/authorize'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import {
  createVaultFileDownloadUrl,
  mapVaultFileRow,
} from '../../../../utils/vault-files'
import { isValidClientFileId } from '../../../../utils/client-files'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })

  const user = await requireVaultAccess(event, vaultId, 'read')
  const body = await readBody(event)

  const fileIds = Array.isArray(body?.fileIds)
    ? body.fileIds.filter((id: unknown): id is string => typeof id === 'string' && isValidClientFileId(id))
    : []

  const folderPath = typeof body?.folderPath === 'string'
    ? body.folderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    : ''

  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('vault_files')
    .select('id, vault_id, name, relative_path, mime, size, uploaded_at')
    .eq('vault_id', vaultId)

  if (fileIds.length > 0) {
    query = query.in('id', fileIds)
  }
  else if (folderPath) {
    query = query.or(`relative_path.eq.${folderPath},relative_path.like.${folderPath}/%`)
  }
  else {
    throw createError({ statusCode: 400, statusMessage: 'fileIds or folderPath required' })
  }

  const { data, error } = await query.order('relative_path').order('name')
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list files' })
  }

  const files = (data ?? []).map(mapVaultFileRow)
  const downloads = await Promise.all(files.map(async (file) => {
    const zipPath = file.relativePath || file.name
    const url = await createVaultFileDownloadUrl(user.orgId, vaultId, file.id, zipPath)
    return { file, url }
  }))

  return { downloads }
})
