import { requireClientInOrg } from '../../../../utils/client-map'
import { mapClientRecord, parseSectionParam } from '../../../../utils/client-records'
import { filterVisibleProjects } from '../../../../utils/project-access'
import { getSupabaseAdmin } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)

  const query = getQuery(event)
  const section = parseSectionParam(typeof query.section === 'string' ? query.section : undefined)
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  const supabase = getSupabaseAdmin()
  let request = supabase
    .from('client_records')
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('section', section)
    .order('title')

  const { data, error } = await request
  if (error) {
    const message = error.message.includes('client_records')
      ? 'Run npm run migrate to enable client sections'
      : 'Failed to list records'
    throw createError({ statusCode: 500, statusMessage: message })
  }

  let rows = data ?? []
  if (section === 'projects') {
    rows = filterVisibleProjects(user, rows)
  }

  let records = rows.map(mapClientRecord)
  if (search) {
    records = records.filter((record) => {
      const haystack = [
        record.title,
        record.notes ?? '',
        ...Object.values(record.metadata),
      ].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }

  return { records }
})
