import { requireAuth, getAccessibleVaults } from '../utils/authorize'
import { getSupabaseAdmin } from '../utils/supabase'
import { CLIENT_SECTIONS, isClientSection } from '../../utils/client-sections'
import { ITEM_TYPE_LABELS, type VaultItemType } from '../../types/vault'

const MAX_CLIENTS = 8
const MAX_CREDENTIALS = 12
const MAX_RECORDS = 8

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const raw = typeof query.q === 'string' ? query.q.trim() : ''

  if (!raw) {
    return { clients: [], credentials: [], records: [] }
  }

  const ilike = escapeIlike(raw)
  const supabase = getSupabaseAdmin()

  const [clientsRes, vaults, recordsRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, industry, slug')
      .eq('org_id', user.orgId)
      .or(`name.ilike.%${ilike}%,industry.ilike.%${ilike}%,slug.ilike.%${ilike}%`)
      .order('name')
      .limit(MAX_CLIENTS),
    getAccessibleVaults(user),
    supabase
      .from('client_records')
      .select(`
        id,
        client_id,
        section,
        title,
        clients!inner(id, name, org_id)
      `)
      .eq('clients.org_id', user.orgId)
      .ilike('title', `%${ilike}%`)
      .limit(MAX_RECORDS),
  ])

  if (clientsRes.error) {
    throw createError({ statusCode: 500, statusMessage: 'Search failed' })
  }

  const clients = (clientsRes.data ?? []).map(client => ({
    type: 'client' as const,
    id: client.id,
    name: client.name,
    industry: client.industry,
    href: `/clients/${client.id}`,
  }))

  const vaultMap = new Map(vaults.map(vault => [vault.id, vault]))
  const vaultIds = vaults.map(vault => vault.id)
  const vaultClientIds = [...new Set(
    vaults.map(vault => vault.client_id).filter((id): id is string => Boolean(id)),
  )]

  let credentials: Array<{
    type: 'credential'
    id: string
    name: string
    url: string | null
    itemType: string
    itemTypeLabel: string
    vaultId: string
    vaultName: string
    clientId: string | null
    clientName: string | null
    href: string
  }> = []

  if (vaultIds.length > 0) {
    const [itemsRes, vaultClientsRes] = await Promise.all([
      supabase
        .from('vault_items')
        .select('id, name, url, item_type, vault_id')
        .in('vault_id', vaultIds)
        .or(`name.ilike.%${ilike}%,url.ilike.%${ilike}%,item_type.ilike.%${ilike}%`)
        .order('name')
        .limit(MAX_CREDENTIALS),
      vaultClientIds.length > 0
        ? supabase.from('clients').select('id, name').in('id', vaultClientIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (itemsRes.error) {
      throw createError({ statusCode: 500, statusMessage: 'Search failed' })
    }

    const vaultClientMap = new Map(
      (vaultClientsRes.data ?? []).map(client => [client.id, client.name]),
    )

    credentials = (itemsRes.data ?? []).map((item) => {
      const vault = vaultMap.get(item.vault_id)
      const clientId = vault?.client_id ?? null
      const itemTypeLabel = ITEM_TYPE_LABELS[item.item_type as VaultItemType] ?? item.item_type
      const href = clientId
        ? `/clients/${clientId}/credentials?item=${item.id}`
        : `/vault/${item.vault_id}/${item.id}`

      return {
        type: 'credential' as const,
        id: item.id,
        name: item.name,
        url: item.url,
        itemType: item.item_type,
        itemTypeLabel,
        vaultId: item.vault_id,
        vaultName: vault?.name ?? 'Vault',
        clientId,
        clientName: clientId ? vaultClientMap.get(clientId) ?? null : null,
        href,
      }
    })
  }

  const records = !recordsRes.error
    ? (recordsRes.data ?? []).map((row) => {
        const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
        const section = isClientSection(row.section) ? row.section : 'documents'
        const sectionLabel = CLIENT_SECTIONS[section]?.label ?? row.section
        return {
          type: 'record' as const,
          id: row.id,
          title: row.title,
          section,
          sectionLabel,
          clientId: row.client_id,
          clientName: client?.name ?? 'Client',
          href: `/clients/${row.client_id}/${section}`,
        }
      })
    : []

  return { clients, credentials, records }
})
