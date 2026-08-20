import { getSupabaseAdmin } from './supabase'
import { maybeRunRetentionPurge } from './retention-purge'

export { ACTIVITY_RETENTION_DAYS, activityCutoffIso } from './retention-purge'

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

  maybeRunRetentionPurge()
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
