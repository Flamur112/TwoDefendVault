import { requireVaultAccess } from '../../../../utils/authorize'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import { mapVaultFileRow } from '../../../../utils/vault-files'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })

  await requireVaultAccess(event, vaultId, 'read')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('vault_files')
    .select('id, vault_id, name, relative_path, mime, size, uploaded_at')
    .eq('vault_id', vaultId)
    .order('relative_path')
    .order('name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list files' })
  }

  return {
    files: (data ?? []).map(mapVaultFileRow),
  }
})
