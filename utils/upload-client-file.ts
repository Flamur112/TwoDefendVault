import { FILE_MAX_BYTES } from '~/utils/file-limits'
import type { DocumentAttachment } from '~/utils/document-attachments'
import { attachmentRelativePath } from '~/utils/document-attachments'
import { downloadFilesAsZip } from '~/utils/folder-zip'
import { filesInFolder } from '~/utils/file-tree'
import type { FolderNode } from '~/types/file-tree'

const UPLOAD_CONCURRENCY = 4

interface UploadUrlEntry {
  fileId: string
  signedUrl: string
  token: string
  filename: string
  mime: string
  relativePath: string
}

interface UploadUrlResponse extends UploadUrlEntry {
  path: string
}

interface BatchUploadResponse {
  uploads: UploadUrlEntry[]
}

interface DownloadUrlResponse {
  url: string
}

async function uploadFileToSignedUrl(file: File, entry: UploadUrlEntry): Promise<void> {
  const response = await fetch(entry.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || entry.mime || 'application/octet-stream',
      ...(entry.token ? { 'x-upsert': 'false' } : {}),
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Upload failed for ${entry.filename}`)
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      await worker(items[current], current)
    }
  })
  await Promise.all(runners)
}

function buildAttachment(entry: UploadUrlEntry, file: File): DocumentAttachment {
  return {
    id: entry.fileId,
    name: entry.filename,
    mime: file.type || entry.mime || 'application/octet-stream',
    size: file.size,
    relativePath: entry.relativePath,
    uploadedAt: new Date().toISOString(),
  }
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

  const entry = await $fetch<UploadUrlResponse>(
    `/api/clients/${clientId}/files/upload-url`,
    {
      method: 'POST',
      body: {
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        relativePath: file.name,
      },
    },
  )

  onProgress?.('Uploading…')
  await uploadFileToSignedUrl(file, entry)

  return buildAttachment(entry, file)
}

export async function uploadClientFiles(
  clientId: string,
  files: File[],
  onProgress?: (message: string) => void,
): Promise<DocumentAttachment[]> {
  if (files.length === 0) return []

  for (const file of files) {
    if (file.size > FILE_MAX_BYTES) {
      throw new Error(`${file.name} exceeds the ${FILE_MAX_BYTES / (1024 * 1024)} MB limit`)
    }
  }

  onProgress?.('Preparing uploads…')

  const payload = files.map((file) => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
      || file.name
    return {
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      relativePath,
    }
  })

  const { uploads } = await $fetch<BatchUploadResponse>(
    `/api/clients/${clientId}/files/upload-url`,
    { method: 'POST', body: { files: payload } },
  )

  const pairs = uploads.map((entry, idx) => ({ entry, file: files[idx] }))
  let completed = 0

  await runWithConcurrency(pairs, UPLOAD_CONCURRENCY, async ({ entry, file }) => {
    onProgress?.(`Uploading ${entry.relativePath || entry.filename} (${completed + 1}/${pairs.length})…`)
    await uploadFileToSignedUrl(file, entry)
    completed += 1
  })

  return pairs.map(({ entry, file }) => buildAttachment(entry, file))
}

export async function getClientFileDownloadUrl(
  clientId: string,
  fileId: string,
  downloadName?: string,
): Promise<string> {
  const data = await $fetch<DownloadUrlResponse>(
    `/api/clients/${clientId}/files/${fileId}/download-url`,
    downloadName ? { query: { name: downloadName } } : undefined,
  )
  return data.url
}

export async function deleteClientFile(clientId: string, fileId: string): Promise<void> {
  await $fetch(`/api/clients/${clientId}/files/${fileId}`, { method: 'DELETE' })
}

export async function downloadClientAttachment(
  clientId: string,
  attachment: DocumentAttachment,
): Promise<void> {
  const url = await getClientFileDownloadUrl(
    clientId,
    attachment.id,
    attachmentRelativePath(attachment),
  )
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function downloadClientAttachmentsZip(
  clientId: string,
  attachments: DocumentAttachment[],
  folderPath: string,
  zipName: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  onProgress?.('Preparing download…')

  const treeItems = attachments.map(attachment => ({
    id: attachment.id,
    name: attachment.name,
    relativePath: attachmentRelativePath(attachment),
    mime: attachment.mime,
    size: attachment.size,
  }))

  const inFolder = filesInFolder(treeItems, folderPath)
  if (inFolder.length === 0) {
    throw new Error('No files to download')
  }

  const entries = await Promise.all(inFolder.map(async (file) => {
    const url = await getClientFileDownloadUrl(clientId, file.id, file.relativePath)
    return {
      zipPath: file.relativePath,
      url,
      label: file.relativePath,
    }
  }))

  await downloadFilesAsZip(entries, zipName, onProgress)
}

export async function downloadClientAttachmentFolderZip(
  clientId: string,
  attachments: DocumentAttachment[],
  node: FolderNode,
  zipName: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  await downloadClientAttachmentsZip(clientId, attachments, node.path, zipName, onProgress)
}
