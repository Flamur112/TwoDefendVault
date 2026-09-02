import { zip } from 'fflate'

export interface FolderZipEntry {
  zipPath: string
  url: string
  label: string
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadFilesAsZip(
  entries: FolderZipEntry[],
  zipName: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  if (entries.length === 0) {
    throw new Error('No files to download')
  }

  const zipEntries: Record<string, Uint8Array> = {}
  let index = 0

  for (const entry of entries) {
    index += 1
    onProgress?.(`Fetching ${entry.label} (${index}/${entries.length})…`)
    const response = await fetch(entry.url)
    if (!response.ok) {
      throw new Error(`Failed to download ${entry.label}`)
    }
    zipEntries[entry.zipPath] = new Uint8Array(await response.arrayBuffer())
  }

  onProgress?.('Creating zip…')

  const zipped = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    zip(zipEntries, (error, data) => {
      if (error) reject(error)
      else resolve(data as Uint8Array<ArrayBuffer>)
    })
  })

  triggerBlobDownload(new Blob([zipped], { type: 'application/zip' }), zipName)
}
