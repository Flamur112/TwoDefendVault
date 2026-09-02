import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../utils/clients'
import { mapClientRecord, normalizeMetadata } from '../../../../utils/client-records'
import { deleteClientFiles } from '../../../../utils/client-files'
import { requireProjectEdit } from '../../../../utils/project-access'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import {
  parseDocumentAttachments,
  parseDocumentAttachmentsFromRow,
} from '../../../../../utils/document-attachments'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  if (!clientId || !recordId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and record ID required' })
  }

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('client_records')
    .select('id, section, title, notes, metadata')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Record not found' })
  }

  if (existing.section === 'projects') {
    requireProjectEdit(user, existing.metadata)
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

  const nextMetadata = body?.metadata !== undefined
    ? normalizeMetadata(body.metadata)
    : null

  if (nextMetadata) {
    updates.metadata = nextMetadata
  }

  if (existing.section === 'documents' && nextMetadata) {
    const previousAttachments = parseDocumentAttachmentsFromRow(
      existing.metadata as Record<string, unknown> | null,
    )
    const nextAttachments = parseDocumentAttachments(nextMetadata)
    const nextIds = new Set(nextAttachments.map(a => a.id))
    const removedIds = previousAttachments
      .filter(a => !nextIds.has(a.id))
      .map(a => a.id)
    if (removedIds.length > 0) {
      await deleteClientFiles(client.org_id, clientId, removedIds)
    }
  }

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

  await logClientActivity(clientId, user.id, `${record.section}_updated`, {
    title: record.title,
    recordId: record.id,
  })

  return { record: mapClientRecord(record) }
})
