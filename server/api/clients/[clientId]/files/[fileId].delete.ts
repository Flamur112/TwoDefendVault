import { requireClientInOrg } from '../../../../utils/client-map'
import { canEditClients } from '../../../../utils/clients'
import {
  clientFileStoragePath,
  CLIENT_FILES_BUCKET,
  isValidClientFileId,
} from '../../../../utils/client-files'
import { getSupabaseAdmin } from '../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const fileId = getRouterParam(event, 'fileId')
  if (!clientId || !fileId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and file ID required' })
  }

  if (!isValidClientFileId(fileId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file ID' })
  }

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const path = clientFileStoragePath(client.org_id, clientId, fileId)
  const { error } = await supabase.storage.from(CLIENT_FILES_BUCKET).remove([path])

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete file' })
  }

  return { success: true }
})
