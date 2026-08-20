import {
  LOGO_MAX_OUTPUT_BYTES,
  LOGO_MAX_UPLOAD_BYTES,
  LOGO_MAX_WIDTH,
} from '~/utils/logo-limits'
import {
  compressImageFile,
  outputNameForMime,
  validateImageFile,
} from '~/utils/compress-image'
import { formatFileSize } from '~/utils/image-limits'

export async function uploadClientLogo(clientId: string, file: File): Promise<{ url: string }> {
  validateImageFile(file)

  const { blob, mime } = await compressImageFile(file, {
    maxWidth: LOGO_MAX_WIDTH,
    maxOutputBytes: LOGO_MAX_OUTPUT_BYTES,
  })

  if (blob.size > LOGO_MAX_UPLOAD_BYTES) {
    throw new Error(`Compressed logo is still too large (${formatFileSize(blob.size)}). Try a simpler image.`)
  }

  const form = new FormData()
  form.append('file', blob, outputNameForMime(file, mime))

  return $fetch<{ url: string }>(`/api/clients/${clientId}/logo`, {
    method: 'POST',
    body: form,
  })
}
