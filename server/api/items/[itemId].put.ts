import { requireItemAccess } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'

const VALID_TYPES = ['login', 'api_key', 'ssh', 'totp', 'note', 'recovery'] as const

export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'itemId')
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireItemAccess(event, itemId, 'write')
  const body = await readBody(event)

  const updates: Record<string, unknown> = {}

  if (body?.itemType !== undefined) {
    if (!VALID_TYPES.includes(body.itemType)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid item type' })
    }
    updates.item_type = body.itemType
  }

  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw createError({ statusCode: 400, statusMessage: 'Item name is required' })
    updates.name = name
  }

  if (body?.url !== undefined) {
    updates.url = typeof body.url === 'string' ? body.url.trim() || null : null
  }

  if (body?.tags !== undefined) {
    updates.tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : []
  }

  if (body?.encryptedData !== undefined) {
    if (typeof body.encryptedData !== 'string' || !body.encryptedData) {
      throw createError({ statusCode: 400, statusMessage: 'Encrypted data is required' })
    }
    updates.encrypted_data = body.encryptedData
  }

  updates.updated_at = new Date().toISOString()

  if (Object.keys(updates).length === 1) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  const supabase = getSupabaseAdmin()
  const { data: item, error } = await supabase
    .from('vault_items')
    .update(updates)
    .eq('id', itemId)
    .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_at, updated_at')
    .single()

  if (error || !item) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update item' })
  }

  await auditFromEvent(event, {
    user,
    action: 'vault_item.update',
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
