import { requireClientInOrg } from '../../../../utils/client-map'
import { mapClientRecord, parseSectionParam } from '../../../../utils/client-records'
import { CLIENT_RECORDS_LIMIT } from '../../../../utils/api-limits'
import { filterVisibleProjects } from '../../../../utils/project-access'
import { filterVisibleRecords } from '../../../../../utils/record-access'
import { getSupabaseAdmin } from '../../../../utils/supabase'

interface ClientRecordRow {
  id: string
  client_id: string
  section: string
  title: string
  notes?: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function listColumnsForSection(section: string): string {
  if (section === 'documents') {
    return 'id, client_id, section, title, metadata, created_at, updated_at'
  }
  return 'id, client_id, section, title, notes, metadata, created_at, updated_at'
}

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)

  const query = getQuery(event)
  const section = parseSectionParam(typeof query.section === 'string' ? query.section : undefined)
  const search = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .select(listColumnsForSection(section))
    .eq('client_id', clientId)
    .eq('section', section)
    .order('title')
    .limit(CLIENT_RECORDS_LIMIT + 1)

  if (error) {
    const message = error.message.includes('client_records')
      ? 'Run npm run migrate to enable client sections'
      : 'Failed to list records'
    throw createError({ statusCode: 500, statusMessage: message })
  }

  let rows = (data ?? []) as unknown as ClientRecordRow[]
  if (section === 'projects') {
    rows = filterVisibleProjects(user, rows)
  }
  else {
    rows = filterVisibleRecords(user, rows.map(row => ({
      ...row,
      metadata: (row.metadata ?? {}) as Record<string, string>,
    })))
  }

  const truncated = rows.length > CLIENT_RECORDS_LIMIT
  rows = rows.slice(0, CLIENT_RECORDS_LIMIT)

  let records = rows.map(row => mapClientRecord({
    id: row.id,
    client_id: row.client_id,
    section: row.section,
    title: row.title,
    notes: row.notes ?? null,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

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

  return {
    records,
    truncated,
    limit: CLIENT_RECORDS_LIMIT,
  }
})
