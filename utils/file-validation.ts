/** Shared client/server file upload validation. */

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'scr', 'ps1', 'vbs', 'js', 'jar',
])

export function isBlockedFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return BLOCKED_EXTENSIONS.has(ext)
}

export function fileRelativePath(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

export interface SkippedUploadFile {
  name: string
  relativePath: string
  reason: string
}

export function partitionUploadFiles(
  files: File[],
  maxBytes: number,
): { uploadable: File[], skipped: SkippedUploadFile[] } {
  const uploadable: File[] = []
  const skipped: SkippedUploadFile[] = []

  for (const file of files) {
    const relativePath = fileRelativePath(file)
    if (file.size <= 0) {
      skipped.push({ name: file.name, relativePath, reason: 'Empty file' })
      continue
    }
    if (file.size > maxBytes) {
      skipped.push({
        name: file.name,
        relativePath,
        reason: `Over ${maxBytes / (1024 * 1024)} MB limit`,
      })
      continue
    }
    if (isBlockedFilename(file.name)) {
      skipped.push({
        name: file.name,
        relativePath,
        reason: 'File type not allowed',
      })
      continue
    }
    uploadable.push(file)
  }

  return { uploadable, skipped }
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
