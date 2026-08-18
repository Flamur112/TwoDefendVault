import { randomUUID } from 'node:crypto'
import { requireClientInOrg } from '../../../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../../../utils/clients'
import {
  appendProjectUpdate,
  createStatusChangeUpdate,
  getPreviousProjectStatus,
  loadProjectRecord,
  readProjectMetadata,
  saveProjectMetadata,
} from '../../../../../utils/project-record'
import { requireProjectEdit } from '../../../../../utils/project-access'
import { isProjectStatus, type ProjectUpdate } from '../../../../../../utils/projects'

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
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const status = typeof body?.status === 'string' && isProjectStatus(body.status)
    ? body.status
    : undefined

  if (!text && !status) {
    throw createError({ statusCode: 400, statusMessage: 'Update text or status is required' })
  }

  const existing = await loadProjectRecord(clientId, recordId)
  requireProjectEdit(user, existing.metadata)
  const metadata = readProjectMetadata(existing)
  const previousStatus = getPreviousProjectStatus(metadata)
  const userName = user.displayName?.trim() || user.email
  let entry: ProjectUpdate | null = null

  if (text) {
    entry = {
      id: randomUUID(),
      userId: user.id,
      userName,
      text,
      ...(status ? { status } : {}),
      createdAt: new Date().toISOString(),
    }
  }
  else if (status && status !== previousStatus) {
    entry = createStatusChangeUpdate(user, status, randomUUID())
  }

  if (entry) {
    appendProjectUpdate(metadata, entry, status)
  }
  else if (status) {
    metadata.status = status
  }

  const record = await saveProjectMetadata(clientId, recordId, metadata)

  await logClientActivity(clientId, user.id, 'projects_updated', {
    title: record.title,
    ...(text ? { update: text.slice(0, 120) } : {}),
    ...(status ? { status } : {}),
  })

  return { record }
})
