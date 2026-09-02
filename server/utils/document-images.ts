import { getSupabaseAdmin } from './supabase'

export const DOCUMENT_IMAGES_BUCKET = 'document-images'

const IMAGE_ID_PATTERN = /^[0-9a-f-]{36}$/i
const IMAGE_URL_PATTERN = /!\[[^\]]*\]\(\/api\/clients\/[0-9a-f-]+\/documents\/images\/([^)]+)\)/gi

export function isValidDocumentImageId(imageId: string): boolean {
  return IMAGE_ID_PATTERN.test(imageId)
}

export function documentImageStoragePath(orgId: string, clientId: string, imageId: string): string {
  return `${orgId}/${clientId}/${imageId}`
}

export function documentImageApiUrl(clientId: string, imageId: string): string {
  return `/api/clients/${clientId}/documents/images/${imageId}`
}

export function extractDocumentImageIds(markdown: string | null | undefined): string[] {
  if (!markdown) return []
  const ids = new Set<string>()
  for (const match of markdown.matchAll(IMAGE_URL_PATTERN)) {
    const id = match[1]
    if (id && isValidDocumentImageId(id)) ids.add(id)
  }
  return [...ids]
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

const ALLOWED_UPLOAD_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isAllowedUploadMime(mime: string | undefined): boolean {
  return Boolean(mime && ALLOWED_UPLOAD_MIMES.has(mime))
}

export async function deleteDocumentImages(
  orgId: string,
  clientId: string,
  imageIds: string[],
): Promise<void> {
  if (imageIds.length === 0) return

  const paths = imageIds
    .filter(isValidDocumentImageId)
    .map(id => documentImageStoragePath(orgId, clientId, id))

  if (paths.length === 0) return

  const supabase = getSupabaseAdmin()
  await supabase.storage.from(DOCUMENT_IMAGES_BUCKET).remove(paths)
}
