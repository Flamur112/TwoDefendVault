import { requireAuth } from '../../utils/authorize'
import { mapOrgSectionRecord, parseSectionParam } from '../../utils/client-records'
import { getSupabaseAdmin } from '../../utils/supabase'

const ORG_RECORDS_LIMIT = 500

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const section = parseSectionParam(typeof query.section === 'string' ? query.section : undefined)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .select(`
      id,
      client_id,
      section,
      title,
      notes,
      metadata,
      created_at,
      updated_at,
      clients!inner(name, slug, org_id)
    `)
    .eq('section', section)
    .eq('clients.org_id', user.orgId)
    .order('title')
    .limit(ORG_RECORDS_LIMIT + 1)

  if (error) {
    const message = error.message.includes('client_records')
      ? 'Run npm run migrate to enable client sections'
      : 'Failed to list records'
    throw createError({ statusCode: 500, statusMessage: message })
  }

  const rows = data ?? []
  const truncated = rows.length > ORG_RECORDS_LIMIT
  const records = rows.slice(0, ORG_RECORDS_LIMIT).map(row => mapOrgSectionRecord(row))

  return {
    records,
    truncated,
    limit: ORG_RECORDS_LIMIT,
  }
})
