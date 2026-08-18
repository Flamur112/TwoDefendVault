import { requireClientInOrg } from '../../../../../utils/client-map'
import {
  DOCUMENT_IMAGES_BUCKET,
  documentImageStoragePath,
  isValidDocumentImageId,
} from '../../../../../utils/document-images'
import { getSupabaseAdmin } from '../../../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  const imageId = getRouterParam(event, 'imageId')
  if (!clientId || !imageId) {
    throw createError({ statusCode: 400, statusMessage: 'Client and image ID required' })
  }

  if (!isValidDocumentImageId(imageId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image ID' })
  }

  const { client } = await requireClientInOrg(event, clientId)
  const storagePath = documentImageStoragePath(client.org_id, clientId, imageId)

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(DOCUMENT_IMAGES_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  setHeader(event, 'Content-Type', data.type || 'image/jpeg')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')

  return buffer
})
