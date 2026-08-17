import { requireVaultAccess } from '../../../utils/authorize'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })
  }

  await requireVaultAccess(event, vaultId, 'read')

  const supabase = getSupabaseAdmin()
  const { data: items, error } = await supabase
    .from('vault_items')
    .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_at, updated_at')
    .eq('vault_id', vaultId)
    .order('name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list items' })
  }

  return {
    items: (items ?? []).map(item => ({
      id: item.id,
      vaultId: item.vault_id,
      itemType: item.item_type,
      name: item.name,
      url: item.url,
      tags: item.tags,
      encryptedData: item.encrypted_data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  }
})
