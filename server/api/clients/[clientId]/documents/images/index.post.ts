import { randomUUID } from 'node:crypto'
import { IMAGE_MAX_UPLOAD_BYTES } from '~/utils/image-limits'
import { requireClientInOrg } from '../../../../../utils/client-map'
import { canEditClients } from '../../../../../utils/clients'
import {
  DOCUMENT_IMAGES_BUCKET,
  documentImageApiUrl,
  documentImageStoragePath,
  isAllowedUploadMime,
} from '../../../../../utils/document-images'
import { getSupabaseAdmin } from '../../../../../utils/supabase'

const MAX_UPLOAD_BYTES = IMAGE_MAX_UPLOAD_BYTES

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

  if (filePart.data.length > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image must be under 800 KB after compression',
    })
  }

  const mime = filePart.type || 'application/octet-stream'
  if (!isAllowedUploadMime(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }

  const imageId = randomUUID()
  const storagePath = documentImageStoragePath(client.org_id, clientId, imageId)

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(DOCUMENT_IMAGES_BUCKET)
    .upload(storagePath, filePart.data, {
      contentType: mime,
      upsert: false,
    })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to store image' })
  }

  return {
    id: imageId,
    url: documentImageApiUrl(clientId, imageId),
  }
})
