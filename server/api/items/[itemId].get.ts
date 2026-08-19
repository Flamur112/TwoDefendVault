import { requireItemAccess } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'
import { buildItemDecryptKeyMaterials } from '../../utils/vault-key'

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireItemAccess(event, itemId, 'read')
  const config = useRuntimeConfig()

  if (!config.vaultKeyMaterial) {
    throw createError({ statusCode: 503, statusMessage: 'Vault key material not configured' })
  }

  const supabase = getSupabaseAdmin()
  const { data: item, error } = await supabase
    .from('vault_items')
    .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_by, created_at, updated_at')
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

  const decryptKeys = buildItemDecryptKeyMaterials(
    config.vaultKeyMaterial,
    user.orgId,
    user.id,
    item.created_by,
  )

  return {
    item: {
      id: item.id,
      vaultId: item.vault_id,
      itemType: item.item_type,
      name: item.name,
      url: item.url,
      tags: item.tags,
      encryptedData: item.encrypted_data,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    },
    decryptKeys,
  }
})
