import { requireClientInOrg } from '../../../../../utils/client-map'
import { activityCutoffIso } from '../../../../../../utils/retention'
import { getSupabaseAdmin } from '../../../../../utils/supabase'

function matchesDocumentRecord(
  action: string,
  metadata: Record<string, unknown> | null,
  recordId: string,
  recordTitle: string,
): boolean {
  if (!action.startsWith('documents_')) return false
  if (metadata?.recordId === recordId) return true
  if (!metadata?.recordId && metadata?.title === recordTitle) return true
  return false
}

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  await requireClientInOrg(event, clientId)

  const supabase = getSupabaseAdmin()
  const { data: record, error: recordError } = await supabase
    .from('client_records')
    .select('id, title, section')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (recordError || !record) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  const { data, error } = await supabase
    .from('client_activity')
    .select('id, action, metadata, created_at, user_id, users(display_name, email)')
    .eq('client_id', clientId)
    .gte('created_at', activityCutoffIso())
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load activity' })
  }

  const activity = (data ?? [])
    .filter(row => matchesDocumentRecord(
      row.action,
      row.metadata as Record<string, unknown> | null,
      recordId,
      record.title,
    ))
    .map(row => ({
      id: row.id,
      action: row.action,
      metadata: row.metadata,
      createdAt: row.created_at,
      userName: (row.users as { display_name?: string, email?: string } | null)?.display_name
        ?? (row.users as { email?: string } | null)?.email
        ?? 'System',
    }))

  return { activity }
})
