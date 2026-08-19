import { FILE_MAX_BYTES } from '~/utils/file-limits'
import type { DocumentAttachment } from '~/utils/document-attachments'

interface UploadUrlResponse {
  fileId: string
  signedUrl: string
  token: string
  path: string
}

interface DownloadUrlResponse {
  url: string
}

/** Upload file direct to Supabase — server only mints the signed URL. */
export async function uploadClientFile(
  clientId: string,
  file: File,
  onProgress?: (message: string) => void,
): Promise<DocumentAttachment> {
  if (file.size > FILE_MAX_BYTES) {
    throw new Error(`File must be under ${FILE_MAX_BYTES / (1024 * 1024)} MB`)
  }

  onProgress?.('Preparing upload…')

  const { fileId, signedUrl, token } = await $fetch<UploadUrlResponse>(
    `/api/clients/${clientId}/files/upload-url`,
    {
      method: 'POST',
      body: {
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      },
    },
  )

  onProgress?.('Uploading…')

  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      ...(token ? { 'x-upsert': 'false' } : {}),
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Upload to storage failed')
  }

  return {
    id: fileId,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }
}

export async function getClientFileDownloadUrl(
  clientId: string,
  fileId: string,
): Promise<string> {
  const data = await $fetch<DownloadUrlResponse>(
    `/api/clients/${clientId}/files/${fileId}/download-url`,
  )
  return data.url
}

export async function deleteClientFile(clientId: string, fileId: string): Promise<void> {
  await $fetch(`/api/clients/${clientId}/files/${fileId}`, { method: 'DELETE' })
}
