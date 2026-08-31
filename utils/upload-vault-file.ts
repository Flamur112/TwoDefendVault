import { zip } from 'fflate'
import type { VaultFileRecord } from '~/types/vault-file'
import { FILE_MAX_BYTES } from '~/utils/file-limits'

const UPLOAD_CONCURRENCY = 4

interface UploadUrlEntry {
  fileId: string
  signedUrl: string
  token: string
  filename: string
  mime: string
  relativePath: string
}

interface BatchUploadResponse {
  uploads: UploadUrlEntry[]
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

export async function uploadVaultFiles(
  vaultId: string,
  files: File[],
  onProgress?: (message: string) => void,
): Promise<VaultFileRecord[]> {
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
    `/api/vaults/${vaultId}/files/upload-url`,
    { method: 'POST', body: { files: payload } },
  )

  const pairs = uploads.map((entry, idx) => ({ entry, file: files[idx] }))
  let completed = 0

  await runWithConcurrency(pairs, UPLOAD_CONCURRENCY, async ({ entry, file }) => {
    onProgress?.(`Uploading ${entry.relativePath || entry.filename} (${completed + 1}/${pairs.length})…`)
    await uploadFileToSignedUrl(file, entry)
    completed += 1
  })

  onProgress?.('Saving file list…')

  const { files: registered } = await $fetch<{ files: VaultFileRecord[] }>(
    `/api/vaults/${vaultId}/files/register`,
    {
      method: 'POST',
      body: {
        files: pairs.map(({ entry, file }) => ({
          fileId: entry.fileId,
          filename: entry.filename,
          mime: entry.mime,
          size: file.size,
          relativePath: entry.relativePath,
        })),
      },
    },
  )

  return registered
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

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
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

  const zipEntries: Record<string, Uint8Array> = {}
  let index = 0

  for (const entry of downloads) {
    index += 1
    onProgress?.(`Fetching ${entry.file.relativePath || entry.file.name} (${index}/${downloads.length})…`)
    const response = await fetch(entry.url)
    if (!response.ok) {
      throw new Error(`Failed to download ${entry.file.name}`)
    }
    const buffer = new Uint8Array(await response.arrayBuffer())
    const zipPath = entry.file.relativePath || entry.file.name
    zipEntries[zipPath] = buffer
  }

  onProgress?.('Creating zip…')

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(zipEntries, (error, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })

  triggerBlobDownload(new Blob([zipped], { type: 'application/zip' }), zipName)
}

export async function downloadVaultFile(vaultId: string, file: VaultFileRecord): Promise<void> {
  const url = await getVaultFileDownloadUrl(vaultId, file.id)
  window.open(url, '_blank', 'noopener,noreferrer')
}
