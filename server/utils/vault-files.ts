import { getSupabaseAdmin } from './supabase'
import {
  CLIENT_FILES_BUCKET,
  isBlockedFilename,
  isValidClientFileId,
  sanitizeFilename,
} from './client-files'

export const VAULT_FILES_MAX = 500
export const VAULT_FOLDER_UPLOAD_MAX = 100

export function vaultFileStoragePath(orgId: string, vaultId: string, fileId: string): string {
  return `${orgId}/vaults/${vaultId}/${fileId}`
}

export function sanitizeRelativePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .split('/')
    .map(part => part.replace(/[^\w\s.-]/g, '').trim())
    .filter(Boolean)
    .slice(0, 20)
    .join('/')
    .slice(0, 500)
}

export function fileNameFromRelativePath(relativePath: string, fallback: string): string {
  const parts = relativePath.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return sanitizeFilename(last || fallback)
}

export function validateVaultFileInput(
  filename: string,
  size: number,
  maxBytes: number,
): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file size' })
  }
  if (size > maxBytes) {
    throw createError({
      statusCode: 400,
      statusMessage: `File must be under ${maxBytes / (1024 * 1024)} MB`,
    })
  }
  if (isBlockedFilename(filename)) {
    throw createError({ statusCode: 400, statusMessage: 'This file type is not allowed' })
  }
}

export async function createVaultFileUploadUrl(
  orgId: string,
  vaultId: string,
  fileId: string,
) {
  const supabase = getSupabaseAdmin()
  const path = vaultFileStoragePath(orgId, vaultId, fileId)

  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to prepare upload' })
  }

  return { path, ...data }
}

export async function createVaultFileDownloadUrl(
  orgId: string,
  vaultId: string,
  fileId: string,
  downloadName?: string,
) {
  const supabase = getSupabaseAdmin()
  const path = vaultFileStoragePath(orgId, vaultId, fileId)

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

export async function deleteVaultFilesFromStorage(
  orgId: string,
  vaultId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return

  const paths = fileIds
    .filter(isValidClientFileId)
    .map(id => vaultFileStoragePath(orgId, vaultId, id))

  if (paths.length === 0) return

  const supabase = getSupabaseAdmin()
  await supabase.storage.from(CLIENT_FILES_BUCKET).remove(paths)
}

export async function deleteAllVaultFiles(orgId: string, vaultId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { data: files } = await supabase
    .from('vault_files')
    .select('id')
    .eq('vault_id', vaultId)

  const fileIds = (files ?? []).map(file => file.id)
  if (fileIds.length === 0) return

  await deleteVaultFilesFromStorage(orgId, vaultId, fileIds)
  await supabase.from('vault_files').delete().eq('vault_id', vaultId)
}

export function mapVaultFileRow(row: {
  id: string
  vault_id: string
  name: string
  relative_path: string
  mime: string
  size: number | string
  uploaded_at: string
}): import('~/types/vault-file').VaultFileRecord {
  return {
    id: row.id,
    vaultId: row.vault_id,
    name: row.name,
    relativePath: row.relative_path,
    mime: row.mime,
    size: Number(row.size),
    uploadedAt: row.uploaded_at,
  }
}
