export const CLIENT_FOLDER_UPLOAD_MAX = 100

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
  return last?.replace(/[^\w\s.-]/g, '').trim().slice(0, 200) || fallback
}
