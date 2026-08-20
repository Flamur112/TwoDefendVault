import { getSupabaseAdmin } from './supabase'

export const CLIENT_LOGOS_BUCKET = 'client-logos'

const LOGO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
const MANAGED_LOGO_PATTERN = /^\/api\/clients\/([^/]+)\/logo$/

export function clientLogoApiUrl(clientId: string): string {
  return `/api/clients/${clientId}/logo`
}

export function clientLogoStoragePath(orgId: string, clientId: string, ext: string): string {
  return `${orgId}/${clientId}/logo.${ext}`
}

export function isManagedClientLogoUrl(url: string | null | undefined): boolean {
  return Boolean(url && MANAGED_LOGO_PATTERN.test(url))
}

export function managedClientLogoId(url: string): string | null {
  const match = url.match(MANAGED_LOGO_PATTERN)
  return match?.[1] ?? null
}

export async function deleteClientLogoFiles(orgId: string, clientId: string): Promise<void> {
  const paths = LOGO_EXTENSIONS.map(ext => clientLogoStoragePath(orgId, clientId, ext))
  const supabase = getSupabaseAdmin()
  await supabase.storage.from(CLIENT_LOGOS_BUCKET).remove(paths)
}

export async function downloadClientLogo(
  orgId: string,
  clientId: string,
): Promise<{ buffer: Buffer, contentType: string } | null> {
  const supabase = getSupabaseAdmin()

  for (const ext of LOGO_EXTENSIONS) {
    const path = clientLogoStoragePath(orgId, clientId, ext)
    const { data, error } = await supabase.storage.from(CLIENT_LOGOS_BUCKET).download(path)
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer())
      return {
        buffer,
        contentType: data.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'),
      }
    }
  }

  return null
}
