import { LOGO_MAX_UPLOAD_BYTES } from '~/utils/logo-limits'
import { mapClient, requireClientInOrg } from '../../../utils/client-map'
import { canEditClients, logClientActivity } from '../../../utils/clients'
import { isClientFavorite } from '../../../utils/client-favorites'
import {
  CLIENT_LOGOS_BUCKET,
  clientLogoApiUrl,
  clientLogoStoragePath,
  deleteClientLogoFiles,
} from '../../../utils/client-logos'
import { extensionForMime, isAllowedUploadMime } from '../../../utils/document-images'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(part => part.name === 'file' && part.data?.length)
  if (!filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Image file required' })
  }

  if (filePart.data.length > LOGO_MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Logo must be under 64 KB after compression',
    })
  }

  const mime = filePart.type || 'application/octet-stream'
  if (!isAllowedUploadMime(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }

  const ext = extensionForMime(mime)
  const storagePath = clientLogoStoragePath(client.org_id, clientId, ext)
  const supabase = getSupabaseAdmin()

  await deleteClientLogoFiles(client.org_id, clientId)

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_LOGOS_BUCKET)
    .upload(storagePath, filePart.data, {
      contentType: mime,
      upsert: true,
      cacheControl: '86400',
    })

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to store logo' })
  }

  const logoUrl = clientLogoApiUrl(clientId)
  const updatedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('clients')
    .update({ logo_url: logoUrl, updated_at: updatedAt })
    .eq('id', clientId)
    .select('*')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update client' })
  }

  await logClientActivity(clientId, user.id, 'edited', { fields: ['logo_url'] })

  const isFavorite = await isClientFavorite(user.id, clientId)
  return { url: logoUrl, client: mapClient(data, { isFavorite }) }
})
