import { requireClientInOrg } from '../../../utils/client-map'
import { getAccessibleVaults } from '../../../utils/authorize'
import { getSupabaseAdmin } from '../../../utils/supabase'

function mapItem(item: {
  id: string
  vault_id: string
  item_type: string
  name: string
  url: string | null
  tags: string[] | null
  encrypted_data: string
  created_at: string
  updated_at: string
}) {
  return {
    id: item.id,
    vaultId: item.vault_id,
    itemType: item.item_type,
    name: item.name,
    url: item.url,
    tags: item.tags,
    encryptedData: item.encrypted_data,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
  }

  const { user } = await requireClientInOrg(event, clientId)
  const accessible = await getAccessibleVaults(user)
  const accessibleIds = new Set(accessible.map(vault => vault.id))

  const supabase = getSupabaseAdmin()
  const { data: vaults, error: vaultError } = await supabase
    .from('vaults')
    .select('id, name, description, client_id, created_at')
    .eq('client_id', clientId)
    .order('name')

  if (vaultError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load credentials' })
  }

  const filteredVaults = (vaults ?? []).filter(vault => accessibleIds.has(vault.id))
  const vaultIds = filteredVaults.map(vault => vault.id)

  const itemsByVault: Record<string, ReturnType<typeof mapItem>[]> = {}
  for (const vaultId of vaultIds) {
    itemsByVault[vaultId] = []
  }

  if (vaultIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('vault_items')
      .select('id, vault_id, item_type, name, url, tags, encrypted_data, created_at, updated_at')
      .in('vault_id', vaultIds)
      .order('name')

    if (itemsError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load credentials' })
    }

    for (const item of items ?? []) {
      itemsByVault[item.vault_id]?.push(mapItem(item))
    }
  }

  return {
    vaults: filteredVaults.map(vault => ({
      id: vault.id,
      name: vault.name,
      description: vault.description,
      clientId: vault.client_id,
      createdAt: vault.created_at,
      itemCount: itemsByVault[vault.id]?.length ?? 0,
    })),
    itemsByVault,
  }
})
