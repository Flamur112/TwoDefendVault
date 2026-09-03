import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../utils/clients'
import { mapClientRecord, normalizeMetadata, parseSectionParam } from '../../../../utils/client-records'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import { applyRecordAccessFromBody } from '../../../../utils/record-access-body'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const section = parseSectionParam(typeof body?.section === 'string' ? body.section : undefined)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : null

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const metadata = await applyRecordAccessFromBody(
    user.orgId,
    user,
    body,
    normalizeMetadata(body?.metadata),
  )

  const supabase = getSupabaseAdmin()
  const { data: record, error } = await supabase
    .from('client_records')
    .insert({
      client_id: clientId,
      section,
      title,
      notes: notes || null,
      metadata,
      created_by: user.id,
    })
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at')
    .single()

  if (error || !record) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create record' })
  }

  await logClientActivity(clientId, user.id, `${section}_added`, { title, recordId: record.id })

  return { record: mapClientRecord(record) }
})
