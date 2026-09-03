import { requireClientInOrg } from '../../../../utils/client-map'
import { mapClientRecord } from '../../../../utils/client-records'
import { requireRecordView } from '../../../../../utils/record-access'
import { requireProjectView } from '../../../../utils/project-access'
import { getSupabaseAdmin } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  const { user: sessionUser } = await requireClientInOrg(event, clientId)

  const supabase = getSupabaseAdmin()
  const { data: record, error } = await supabase
    .from('client_records')
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at, created_by, users(display_name, email)')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !record) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  const mapped = mapClientRecord(record)

  if (mapped.section === 'projects') {
    requireProjectView(sessionUser, record.metadata)
  }
  else {
    requireRecordView(sessionUser, mapped.metadata)
  }

  const creator = record.users as { display_name?: string, email?: string } | null

  return {
    record: {
      ...mapped,
      createdByName: creator?.display_name ?? creator?.email ?? null,
    },
  }
})
