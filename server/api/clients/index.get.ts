import { requireAuth } from '../../utils/authorize'
import { CLIENT_LIST_COLUMNS, mapClient } from '../../utils/client-map'
import { getUserFavoriteClientIds } from '../../utils/client-favorites'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  const supabase = getSupabaseAdmin()
  let request = supabase
    .from('clients')
    .select(CLIENT_LIST_COLUMNS)
    .eq('org_id', user.orgId)
    .order('name')

  if (search) {
    request = request.or(`name.ilike.%${search}%,industry.ilike.%${search}%`)
  }

  const { data: clients, error } = await request

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list clients' })
  }

  const favoriteIds = await getUserFavoriteClientIds(user.id)

  return {
    clients: (clients ?? []).map(c => mapClient(c, { isFavorite: favoriteIds.has(c.id as string) })),
  }
})
