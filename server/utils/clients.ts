import { getSupabaseAdmin } from './supabase'

/** Activity shown in feeds; older rows purged periodically */
export const ACTIVITY_RETENTION_DAYS = 14

let lastActivityPurgeAt = 0
const PURGE_INTERVAL_MS = 60 * 60 * 1000 // at most once per hour

export function activityCutoffIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - ACTIVITY_RETENTION_DAYS)
  return d.toISOString()
}

async function maybePurgeExpiredActivity(): Promise<void> {
  if (Date.now() - lastActivityPurgeAt < PURGE_INTERVAL_MS) return
  lastActivityPurgeAt = Date.now()

  const supabase = getSupabaseAdmin()
  await supabase
    .from('client_activity')
    .delete()
    .lt('created_at', activityCutoffIso())
}

export async function logClientActivity(
  clientId: string,
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase.from('client_activity').insert({
    client_id: clientId,
    user_id: userId,
    action,
    metadata: metadata ?? null,
  })

  // Non-blocking cleanup; throttled to once per hour
  maybePurgeExpiredActivity().catch(() => {})
}

export function slugifyClientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'client'
}

export async function uniqueClientSlug(orgId: string, base: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  let slug = base
  let n = 0

  while (true) {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return slug
    n += 1
    slug = `${base}-${n}`
  }
}

export function canEditClients(role: string): boolean {
  return role === 'admin' || role === 'member'
}

export function canDeleteClients(role: string): boolean {
  return role === 'admin'
}
