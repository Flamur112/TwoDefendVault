import { requireClientInOrg } from '../../../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../../../utils/clients'
import {
  loadProjectRecord,
  readProjectMetadata,
  replaceProjectUpdate,
  saveProjectMetadata,
} from '../../../../../../utils/project-record'
import { requireProjectEdit } from '../../../../../../utils/project-access'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const recordId = getRouterParam(event, 'recordId')
  const updateId = getRouterParam(event, 'updateId')
  if (!clientId || !recordId || !updateId) {
    throw createError({ statusCode: 400, statusMessage: 'Client, record, and update ID required' })
  }

  const { user } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Update text is required' })
  }

  const existing = await loadProjectRecord(clientId, recordId)
  requireProjectEdit(user, existing.metadata)
  const metadata = readProjectMetadata(existing)
  const updated = replaceProjectUpdate(metadata, updateId, text, user)

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Update not found' })
  }

  const record = await saveProjectMetadata(clientId, recordId, metadata)

  await logClientActivity(clientId, user.id, 'projects_updated', {
    title: record.title,
    update: text.slice(0, 120),
    edited: true,
  })

  return { record }
})
