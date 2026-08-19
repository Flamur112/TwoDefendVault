import { getSupabaseAdmin } from './supabase'

export const CLIENT_FILES_BUCKET = 'client-files'

const FILE_ID_PATTERN = /^[0-9a-f-]{36}$/i

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'scr', 'ps1', 'vbs', 'js', 'jar',
])

export function isValidClientFileId(fileId: string): boolean {
  return FILE_ID_PATTERN.test(fileId)
}

export function clientFileStoragePath(orgId: string, clientId: string, fileId: string): string {
  return `${orgId}/${clientId}/${fileId}`
}

export function isBlockedFilename(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return BLOCKED_EXTENSIONS.has(ext)
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w\s.-]/g, '').trim().slice(0, 200) || 'file'
}

export async function deleteClientFiles(
  orgId: string,
  clientId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return

  const paths = fileIds
    .filter(isValidClientFileId)
    .map(id => clientFileStoragePath(orgId, clientId, id))

  if (paths.length === 0) return

  const supabase = getSupabaseAdmin()
  await supabase.storage.from(CLIENT_FILES_BUCKET).remove(paths)
}

export async function createClientFileUploadUrl(
  orgId: string,
  clientId: string,
  fileId: string,
) {
  const supabase = getSupabaseAdmin()
  const path = clientFileStoragePath(orgId, clientId, fileId)

  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to prepare upload' })
  }

  return { path, ...data }
}

export async function createClientFileDownloadUrl(
  orgId: string,
  clientId: string,
  fileId: string,
  downloadName?: string,
) {
  const supabase = getSupabaseAdmin()
  const path = clientFileStoragePath(orgId, clientId, fileId)

  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(path, 3600, downloadName
      ? { download: downloadName }
      : undefined)

  if (error || !data?.signedUrl) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  return data.signedUrl
}

export async function clientFileExists(
  orgId: string,
  clientId: string,
  fileId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const path = clientFileStoragePath(orgId, clientId, fileId)
  const folder = path.split('/').slice(0, -1).join('/')
  const name = path.split('/').pop()!

  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .list(folder, { search: name, limit: 1 })

  if (error) return false
  return (data ?? []).some(entry => entry.name === name)
}
