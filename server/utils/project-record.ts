import type { SessionUser } from './session'
import { mapClientRecord } from './client-records'
import {
  getProjectStatus,
  metadataFromRow,
  parseProjectUpdates,
  PROJECT_UPDATES_KEY,
  serializeProjectUpdates,
  type ProjectUpdate,
} from '../../utils/projects'
import { getSupabaseAdmin } from './supabase'

export async function loadProjectRecord(clientId: string, recordId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at')
    .eq('id', recordId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  if (data.section !== 'projects') {
    throw createError({ statusCode: 400, statusMessage: 'Record is not a project' })
  }

  return data
}

export function readProjectMetadata(row: { metadata: Record<string, unknown> | null }) {
  return metadataFromRow(row.metadata)
}

export async function saveProjectMetadata(
  clientId: string,
  recordId: string,
  metadata: Record<string, string>,
) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('client_id', clientId)
    .select('id, client_id, section, title, notes, metadata, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save project' })
  }

  return mapClientRecord(data)
}

export function appendProjectUpdate(
  metadata: Record<string, string>,
  entry: ProjectUpdate,
  status?: string,
) {
  const updates = parseProjectUpdates(metadata)
  updates.unshift(entry)
  metadata[PROJECT_UPDATES_KEY] = serializeProjectUpdates(updates)
  if (status) metadata.status = status
  return metadata
}

export function replaceProjectUpdate(
  metadata: Record<string, string>,
  updateId: string,
  text: string,
  user: SessionUser,
): boolean {
  const updates = parseProjectUpdates(metadata)
  const index = updates.findIndex(entry => entry.id === updateId)
  if (index === -1) return false

  const existing = updates[index]
  if (!existing) return false
  if (existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only edit your own updates' })
  }

  updates[index] = {
    ...existing,
    text,
    updatedAt: new Date().toISOString(),
  }

  metadata[PROJECT_UPDATES_KEY] = serializeProjectUpdates(updates)
  return true
}

export function createStatusChangeUpdate(
  user: SessionUser,
  status: string,
  id: string,
): ProjectUpdate {
  return {
    id,
    userId: user.id,
    userName: user.displayName?.trim() || user.email,
    text: `Status changed to ${status}`,
    status,
    createdAt: new Date().toISOString(),
  }
}

export function getPreviousProjectStatus(metadata: Record<string, string>) {
  return getProjectStatus(metadata)
}
