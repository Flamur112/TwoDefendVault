import { CLIENT_LIST_COLUMNS, mapClient } from './client-map'
import { getSupabaseAdmin } from './supabase'

export async function getUserFavoriteClientIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_favorites')
    .select('client_id')
    .eq('user_id', userId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load favorites' })
  }

  return new Set((data ?? []).map(row => row.client_id as string))
}

export async function setClientFavorite(
  userId: string,
  clientId: string,
  isFavorite: boolean,
): Promise<void> {
  const supabase = getSupabaseAdmin()

  if (isFavorite) {
    const { error } = await supabase
      .from('client_favorites')
      .upsert(
        { user_id: userId, client_id: clientId },
        { onConflict: 'user_id,client_id' },
      )
    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to save favorite' })
    }
    return
  }

  const { error } = await supabase
    .from('client_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('client_id', clientId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to remove favorite' })
  }
}

export async function isClientFavorite(userId: string, clientId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_favorites')
    .select('client_id')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load favorite' })
  }

  return !!data
}

export async function countUserFavorites(userId: string, orgId: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from('client_favorites')
    .select('client_id, clients!inner(org_id)', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('clients.org_id', orgId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to count favorites' })
  }

  return count ?? 0
}

export async function listUserFavoriteClients(userId: string, orgId: string, limit = 12) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_favorites')
    .select(`clients!inner(${CLIENT_LIST_COLUMNS})`)
    .eq('user_id', userId)
    .eq('clients.org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load favorites' })
  }

  return (data ?? [])
    .map((row) => {
      const client = row.clients as Record<string, unknown> | Record<string, unknown>[] | null
      const rowClient = Array.isArray(client) ? client[0] : client
      return rowClient ? mapClient(rowClient, { isFavorite: true }) : null
    })
    .filter((client): client is ReturnType<typeof mapClient> => client !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}
