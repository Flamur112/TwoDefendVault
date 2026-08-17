import { requireItemAccess } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireItemAccess(event, itemId, 'read')

  const supabase = getSupabaseAdmin()
  const { data: item, error } = await supabase
    .from('vault_items')
    .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_at, updated_at')
    .eq('id', itemId)
    .single()

  if (error || !item) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await auditFromEvent(event, {
    user,
    action: 'vault_item.view',
    targetType: 'vault_item',
    targetId: item.id,
    metadata: { name: item.name, vaultId: item.vault_id, itemType: item.item_type },
  })

  return {
    item: {
      id: item.id,
      vaultId: item.vault_id,
      itemType: item.item_type,
      name: item.name,
      url: item.url,
      tags: item.tags,
      encryptedData: item.encrypted_data,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    },
  }
})
