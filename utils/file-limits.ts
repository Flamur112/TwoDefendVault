/** File upload limits — bytes go direct to Supabase, not through our server. */
export const FILE_MAX_BYTES = 25 * 1024 * 1024
export const FILE_MAX_MB = 25

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

export function fileSizeLimitMessage(): string {
  return `Files must be under ${FILE_MAX_MB} MB. Upload goes directly to storage.`
}
