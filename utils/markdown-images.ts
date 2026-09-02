import { formatFileSize } from '~/utils/file-limits'
import {
  IMAGE_MAX_UPLOAD_BYTES,
  imageInputLimitMessage,
} from '~/utils/image-limits'
import {
  compressImageFile,
  outputNameForMime,
  validateImageFile,
} from '~/utils/compress-image'

export type ImageUploadStatus = 'checking' | 'compressing' | 'uploading'

export async function uploadImageForMarkdown(
  clientId: string,
  file: File,
  onStatus?: (status: ImageUploadStatus) => void,
): Promise<string> {
  onStatus?.('checking')
  validateImageFile(file)

  onStatus?.('compressing')
  const { blob, mime } = await compressImageFile(file)

  if (blob.size > IMAGE_MAX_UPLOAD_BYTES) {
    throw new Error(
      `Compressed image is still too large (${formatFileSize(blob.size)}). ${imageInputLimitMessage()}`,
    )
  }

  onStatus?.('uploading')
  const form = new FormData()
  form.append('file', blob, outputNameForMime(file, mime))

  const { url } = await $fetch<{ url: string }>(`/api/clients/${clientId}/documents/images`, {
    method: 'POST',
    body: form,
  })

  const alt = file.name.replace(/\.[^.]+$/, '') || 'image'
  return `\n![${alt}](${url})\n`
}
