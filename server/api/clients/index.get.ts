import { requireAuth } from '../../utils/authorize'
import { mapClient } from '../../utils/client-map'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  const supabase = getSupabaseAdmin()
  let dbQuery = supabase
    .from('clients')
    .select('*')
    .eq('org_id', user.orgId)
    .order('name')

  const { data: clients, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list clients' })
  }

  let filtered = clients ?? []
  if (search) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(search)
      || (c.industry?.toLowerCase().includes(search)),
    )
  }

  return { clients: filtered.map(c => mapClient(c)) }
})
