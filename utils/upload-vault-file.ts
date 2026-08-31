import { FILE_MAX_BYTES } from '~/utils/file-limits'
import { CLIENT_FOLDER_UPLOAD_MAX } from '~/utils/file-path'
import type { VaultFileRecord } from '~/types/vault-file'
import {
  chunkArray,
  fileRelativePath,
  partitionUploadFiles,
  type SkippedUploadFile,
} from '~/utils/file-validation'
import { downloadFilesAsZip } from '~/utils/folder-zip'

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

interface BatchUploadResponse {
  uploads: UploadUrlEntry[]
  skipped?: Array<{ clientIndex: number, filename: string, reason: string }>
}

export async function listVaultFiles(vaultId: string): Promise<VaultFileRecord[]> {
  const data = await $fetch<{ files: VaultFileRecord[] }>(`/api/vaults/${vaultId}/files`)
  return data.files
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

async function uploadPreparedVaultBatch(
  vaultId: string,
  files: File[],
  onProgress?: (message: string) => void,
): Promise<{ pairs: Array<{ entry: UploadUrlEntry, file: File }>, skipped: SkippedUploadFile[] }> {
  const payload = files.map((file, clientIndex) => ({
    clientIndex,
    filename: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    relativePath: fileRelativePath(file),
  }))

  const { uploads, skipped: serverSkipped = [] } = await $fetch<BatchUploadResponse>(
    `/api/vaults/${vaultId}/files/upload-url`,
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

  return {
    pairs,
    skipped: serverSkipped.map(item => ({
      name: item.filename,
      relativePath: item.filename,
      reason: item.reason,
    })),
  }
}

export async function uploadVaultFiles(
  vaultId: string,
  files: File[],
  onProgress?: (message: string) => void,
): Promise<{ files: VaultFileRecord[], skipped: SkippedUploadFile[] }> {
  if (files.length === 0) {
    return { files: [], skipped: [] }
  }

  const { uploadable, skipped } = partitionUploadFiles(files, FILE_MAX_BYTES)
  if (uploadable.length === 0) {
    throw new Error(skipped[0]?.reason ?? 'No uploadable files selected')
  }

  const batches = chunkArray(uploadable, CLIENT_FOLDER_UPLOAD_MAX)
  const allPairs: Array<{ entry: UploadUrlEntry, file: File }> = []
  const allSkipped = [...skipped]

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex]
    onProgress?.(
      batches.length > 1
        ? `Preparing batch ${batchIndex + 1} of ${batches.length} (${batch.length} files)…`
        : 'Preparing uploads…',
    )

    const result = await uploadPreparedVaultBatch(vaultId, batch, onProgress)
    allPairs.push(...result.pairs)
    allSkipped.push(...result.skipped)
  }

  onProgress?.('Saving file list…')

  const { files: registered } = await $fetch<{ files: VaultFileRecord[] }>(
    `/api/vaults/${vaultId}/files/register`,
    {
      method: 'POST',
      body: {
        files: allPairs.map(({ entry, file }) => ({
          fileId: entry.fileId,
          filename: entry.filename,
          mime: entry.mime,
          size: file.size,
          relativePath: entry.relativePath,
        })),
      },
    },
  )

  return { files: registered, skipped: allSkipped }
}

export async function getVaultFileDownloadUrl(vaultId: string, fileId: string): Promise<string> {
  const data = await $fetch<{ url: string }>(
    `/api/vaults/${vaultId}/files/${fileId}/download-url`,
  )
  return data.url
}

export async function deleteVaultFile(vaultId: string, fileId: string): Promise<void> {
  await $fetch(`/api/vaults/${vaultId}/files/${fileId}`, { method: 'DELETE' })
}

interface DownloadEntry {
  file: VaultFileRecord
  url: string
}

async function fetchDownloadEntries(
  vaultId: string,
  options: { fileIds?: string[], folderPath?: string },
): Promise<DownloadEntry[]> {
  const data = await $fetch<{ downloads: DownloadEntry[] }>(
    `/api/vaults/${vaultId}/files/download-urls`,
    { method: 'POST', body: options },
  )
  return data.downloads
}

export async function downloadVaultFolderZip(
  vaultId: string,
  folderPath: string,
  zipName: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  onProgress?.('Preparing download…')

  const downloads = await fetchDownloadEntries(vaultId, { folderPath })
  if (downloads.length === 0) {
    throw new Error('No files to download')
  }

  const entries = downloads.map(entry => ({
    zipPath: entry.file.relativePath || entry.file.name,
    url: entry.url,
    label: entry.file.relativePath || entry.file.name,
  }))

  await downloadFilesAsZip(entries, zipName, onProgress)
}

export async function downloadVaultFile(vaultId: string, file: VaultFileRecord): Promise<void> {
  const url = await getVaultFileDownloadUrl(vaultId, file.id)
  window.open(url, '_blank', 'noopener,noreferrer')
}
