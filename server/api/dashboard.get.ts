import { requireAuth, getAccessibleVaults } from '../utils/authorize'
import { countUserFavorites, listUserFavoriteClients } from '../utils/client-favorites'
import { activityCutoffIso } from '../../utils/retention'
import { maybeRunRetentionPurge } from '../utils/retention-purge'
import { getSupabaseAdmin } from '../utils/supabase'
import { ITEM_TYPE_LABELS, type VaultItemType } from '../../types/vault'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  maybeRunRetentionPurge()

  const supabase = getSupabaseAdmin()
  const orgId = user.orgId
  const accessibleVaults = await getAccessibleVaults(user, event)
  const vaultIds = accessibleVaults.map(vault => vault.id)
  const vaultMap = new Map(accessibleVaults.map(vault => [vault.id, vault]))

  const [
    clientCountRes,
    favoriteCount,
    favorites,
    activityRes,
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    countUserFavorites(user.id, orgId),
    listUserFavoriteClients(user.id, orgId, 12),
    supabase
      .from('client_activity')
      .select('id, action, metadata, created_at, client_id, clients!inner(name, org_id), users(display_name, email)')
      .eq('clients.org_id', orgId)
      .gte('created_at', activityCutoffIso())
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  let credentialCount = 0
  let recentCredentials: Array<{
    id: string
    name: string
    itemType: string
    itemTypeLabel: string
    vaultName: string
    clientId: string | null
    clientName: string | null
    updatedAt: string
    href: string
  }> = []

  if (vaultIds.length > 0) {
    const [countRes, itemsRes] = await Promise.all([
      supabase
        .from('vault_items')
        .select('id', { count: 'exact', head: true })
        .in('vault_id', vaultIds),
      supabase
        .from('vault_items')
        .select('id, name, item_type, updated_at, vault_id')
        .in('vault_id', vaultIds)
        .order('updated_at', { ascending: false })
        .limit(8),
    ])

    credentialCount = countRes.count ?? 0

    const recentClientIds = [...new Set(
      (itemsRes.data ?? [])
        .map(item => vaultMap.get(item.vault_id)?.client_id)
        .filter((id): id is string => Boolean(id)),
    )]

    let clientNameMap = new Map<string, string>()
    if (recentClientIds.length > 0) {
      const { data: clientRows } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', recentClientIds)
      clientNameMap = new Map((clientRows ?? []).map(row => [row.id, row.name]))
    }

    recentCredentials = (itemsRes.data ?? []).map((item) => {
      const vault = vaultMap.get(item.vault_id)
      const clientId = vault?.client_id ?? null
      const itemTypeLabel = ITEM_TYPE_LABELS[item.item_type as VaultItemType] ?? item.item_type
      const href = clientId
        ? `/clients/${clientId}/credentials?item=${item.id}`
        : `/vault/${item.vault_id}/${item.id}`

      return {
        id: item.id,
        name: item.name,
        itemType: item.item_type,
        itemTypeLabel,
        vaultName: vault?.name ?? 'Vault',
        clientId,
        clientName: clientId ? clientNameMap.get(clientId) ?? null : null,
        updatedAt: item.updated_at,
        href,
      }
    })
  }

  return {
    stats: {
      clientCount: clientCountRes.count ?? 0,
      favoriteCount,
      credentialCount,
    },
    favorites,
    recentCredentials,
    recentActivity: (activityRes.data ?? []).map(row => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at,
      clientId: row.client_id,
      clientName: (row.clients as { name?: string } | null)?.name ?? 'Client',
      userName: (row.users as { display_name?: string, email?: string } | null)?.display_name
        ?? (row.users as { email?: string } | null)?.email
        ?? 'System',
    })),
  }
})
