import { FILE_MAX_BYTES } from '~/utils/file-limits'
import { CLIENT_FOLDER_UPLOAD_MAX } from '~/utils/file-path'
import type { DocumentAttachment } from '~/utils/document-attachments'
import { attachmentRelativePath } from '~/utils/document-attachments'
import { downloadFilesAsZip } from '~/utils/folder-zip'
import { filesInFolder } from '~/utils/file-tree'
import type { FolderNode } from '~/types/file-tree'
import {
  chunkArray,
  fileRelativePath,
  partitionUploadFiles,
  type SkippedUploadFile,
} from '~/utils/file-validation'

const UPLOAD_CONCURRENCY = 4

interface UploadUrlEntry {
  clientIndex: number
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
  skipped?: Array<{ clientIndex: number, filename: string, reason: string }>
}

interface DownloadUrlResponse {
  url: string
}

export interface ClientUploadResult {
  attachments: DocumentAttachment[]
  skipped: SkippedUploadFile[]
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
    const detail = await response.text().catch(() => '')
    throw new Error(`Upload to storage failed for ${entry.filename}${detail ? `: ${detail.slice(0, 120)}` : ''}`)
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++
      await worker(items[current])
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

async function uploadPreparedBatch(
  clientId: string,
  files: File[],
  onProgress?: (message: string) => void,
): Promise<{ attachments: DocumentAttachment[], skipped: SkippedUploadFile[] }> {
  const payload = files.map((file, clientIndex) => ({
    clientIndex,
    filename: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    relativePath: fileRelativePath(file),
  }))

  const { uploads, skipped: serverSkipped = [] } = await $fetch<BatchUploadResponse>(
    `/api/clients/${clientId}/files/upload-url`,
    { method: 'POST', body: { files: payload } },
  )

  if (!uploads?.length) {
    throw new Error('Upload preparation failed')
  }

  const fileByIndex = new Map(files.map((file, index) => [index, file]))
  const pairs = uploads.map((entry) => {
    const file = fileByIndex.get(entry.clientIndex)
    if (!file) {
      throw new Error(`Upload mapping failed for ${entry.filename}`)
    }
    return { entry, file }
  })

  let completed = 0
  await runWithConcurrency(pairs, UPLOAD_CONCURRENCY, async ({ entry, file }) => {
    completed += 1
    onProgress?.(`Uploading ${entry.relativePath || entry.filename} (${completed}/${pairs.length})…`)
    await uploadFileToSignedUrl(file, entry)
  })

  const skipped = serverSkipped.map(item => ({
    name: item.filename,
    relativePath: item.filename,
    reason: item.reason,
  }))

  return {
    attachments: pairs.map(({ entry, file }) => buildAttachment(entry, file)),
    skipped,
  }
}

/** Upload file direct to Supabase — server only mints the signed URL. */
export async function uploadClientFile(
  clientId: string,
  file: File,
  onProgress?: (message: string) => void,
): Promise<DocumentAttachment> {
  const { uploadable, skipped } = partitionUploadFiles([file], FILE_MAX_BYTES)
  if (uploadable.length === 0) {
    throw new Error(skipped[0]?.reason ?? 'File cannot be uploaded')
  }

  onProgress?.('Preparing upload…')

  const entry = await $fetch<UploadUrlResponse>(
    `/api/clients/${clientId}/files/upload-url`,
    {
      method: 'POST',
      body: {
        clientIndex: 0,
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        relativePath: fileRelativePath(file),
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
): Promise<ClientUploadResult> {
  if (files.length === 0) {
    return { attachments: [], skipped: [] }
  }

  const { uploadable, skipped } = partitionUploadFiles(files, FILE_MAX_BYTES)
  if (uploadable.length === 0) {
    throw new Error(skipped[0]?.reason ?? 'No uploadable files selected')
  }

  const batches = chunkArray(uploadable, CLIENT_FOLDER_UPLOAD_MAX)
  const attachments: DocumentAttachment[] = []
  const allSkipped = [...skipped]

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex]
    onProgress?.(
      batches.length > 1
        ? `Preparing batch ${batchIndex + 1} of ${batches.length} (${batch.length} files)…`
        : 'Preparing uploads…',
    )

    const result = await uploadPreparedBatch(clientId, batch, onProgress)
    attachments.push(...result.attachments)
    allSkipped.push(...result.skipped)
  }

  return { attachments, skipped: allSkipped }
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
