import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../utils/clients'
import { mapClientRecord, normalizeMetadata } from '../../../../utils/client-records'
import { getSupabaseAdmin } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  const { user } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body?.title === 'string') {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    updates.title = title
  }

  if (typeof body?.notes === 'string') {
    updates.notes = body.notes.trim() || null
  }

  if (body?.metadata !== undefined) {
    updates.metadata = normalizeMetadata(body.metadata)
  }

  const supabase = getSupabaseAdmin()
  const { data: record, error } = await supabase
    .from('client_records')
    .update(updates)
    .eq('id', recordId)
    .eq('client_id', clientId)
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at')
    .maybeSingle()

  if (error || !record) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  await logClientActivity(clientId, user.id, `${record.section}_updated`, { title: record.title })

  return { record: mapClientRecord(record) }
})
