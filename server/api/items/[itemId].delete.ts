import { requireItemAccess } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireItemAccess(event, itemId, 'write')

  const supabase = getSupabaseAdmin()
  const { data: item } = await supabase
    .from('vault_items')
    .select('id, name, vault_id, item_type')
    .eq('id', itemId)
    .maybeSingle()

  const { error } = await supabase.from('vault_items').delete().eq('id', itemId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete item' })
  }

  if (item) {
    await auditFromEvent(event, {
      user,
      action: 'vault_item.delete',
      targetType: 'vault_item',
      targetId: item.id,
      metadata: { name: item.name, vaultId: item.vault_id, itemType: item.item_type },
    })
  }

  return { success: true }
})
