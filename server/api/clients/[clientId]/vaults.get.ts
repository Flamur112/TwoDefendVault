import { requireClientInOrg } from '../../../utils/client-map'
import { getAccessibleVaults } from '../../../utils/authorize'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { logClientActivity } from '../../../utils/clients'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)
  const accessible = await getAccessibleVaults(user)
  const accessibleIds = new Set(accessible.map(v => v.id))

  const supabase = getSupabaseAdmin()
  const { data: vaults, error } = await supabase
    .from('vaults')
    .select('id, name, description, client_id, created_at')
    .eq('client_id', clientId)
    .order('name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list vaults' })
  }

  const filtered = (vaults ?? []).filter(v => accessibleIds.has(v.id))

  const vaultIds = filtered.map(v => v.id)
  let itemCounts: Record<string, number> = {}

  if (vaultIds.length > 0) {
    const { data: items } = await supabase
      .from('vault_items')
      .select('vault_id')
      .in('vault_id', vaultIds)

    for (const item of items ?? []) {
      itemCounts[item.vault_id] = (itemCounts[item.vault_id] ?? 0) + 1
    }
  }

  return {
    vaults: filtered.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      clientId: v.client_id,
      createdAt: v.created_at,
      itemCount: itemCounts[v.id] ?? 0,
    })),
  }
})
