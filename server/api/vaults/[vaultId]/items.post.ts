import { requireVaultAccess } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { logClientActivity } from '../../../utils/clients'

const VALID_TYPES = ['login', 'api_key', 'ssh', 'totp', 'note', 'recovery'] as const

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })
  }

  const user = await requireVaultAccess(event, vaultId, 'write')
  const body = await readBody(event)

  const itemType = body?.itemType
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const url = typeof body?.url === 'string' ? body.url.trim() : null
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : []
  const encryptedData = typeof body?.encryptedData === 'string' ? body.encryptedData : ''

  if (!VALID_TYPES.includes(itemType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid item type' })
  }

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Item name is required' })
  }

  if (!encryptedData) {
    throw createError({ statusCode: 400, statusMessage: 'Encrypted data is required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: item, error } = await supabase
    .from('vault_items')
    .insert({
      vault_id: vaultId,
      created_by: user.id,
      item_type: itemType,
      name,
      url: url || null,
      tags,
      encrypted_data: encryptedData,
    })
    .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_at, updated_at')
    .single()

  if (error || !item) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create item' })
  }

  const { data: vault } = await supabase
    .from('vaults')
    .select('client_id')
    .eq('id', vaultId)
    .maybeSingle()

  if (vault?.client_id) {
    await logClientActivity(vault.client_id, user.id, 'credential_added', { itemName: name })
  }

  await auditFromEvent(event, {
    user,
    action: 'vault_item.create',
    targetType: 'vault_item',
    targetId: item.id,
    metadata: { name: item.name, vaultId, itemType: item.item_type },
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
