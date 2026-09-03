import { requireClientInOrg } from '../../../../utils/client-map'
import { canDeleteClients, canEditClients, logClientActivity } from '../../../../utils/clients'
import { deleteClientFiles } from '../../../../utils/client-files'
import { deleteDocumentImages, extractDocumentImageIds } from '../../../../utils/document-images'
import { getSupabaseAdmin } from '../../../../utils/supabase'
import { parseDocumentAttachmentsFromRow } from '../../../../../utils/document-attachments'

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

  if (existing.section === 'projects' && !canDeleteClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can delete projects' })
  }

  const { error } = await supabase
    .from('client_records')
    .delete()
    .eq('id', recordId)
    .eq('client_id', clientId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete record' })
  }

  if (existing.section === 'documents' || existing.section === 'files' || existing.section === 'assets') {
    if (existing.section === 'documents' && existing.notes) {
      const imageIds = extractDocumentImageIds(existing.notes)
      await deleteDocumentImages(client.org_id, clientId, imageIds)
    }

    const attachmentIds = parseDocumentAttachmentsFromRow(
      existing.metadata as Record<string, unknown> | null,
    ).map(a => a.id)
    await deleteClientFiles(client.org_id, clientId, attachmentIds)
  }

  await logClientActivity(clientId, user.id, `${existing.section}_deleted`, {
    title: existing.title,
    recordId: existing.id,
  })

  return { success: true }
})
