import type { AuthenticatedIdentity } from './identity/types'
import { LoginAccessError } from './auth-access'
import { syncUserAvatarFromUrl } from './user-avatar'
import { getSupabaseAdmin } from './supabase'

export interface ResolvedUser {
  id: string
  orgId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: 'admin' | 'member' | 'readonly'
}

export async function getOrganizationId(orgSlug: string): Promise<string> {
  const supabase = getSupabaseAdmin()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .maybeSingle()

  if (!org) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Organization not configured — run seed migration',
    })
  }

  return org.id
}

async function linkIdentity(
  userId: string,
  identity: AuthenticatedIdentity,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('identity_links').insert({
    user_id: userId,
    provider: identity.provider,
    provider_subject: identity.providerSubject,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to link identity' })
  }
}

async function loadActiveUser(userId: string): Promise<ResolvedUser> {
  const supabase = getSupabaseAdmin()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, org_id, email, display_name, avatar_url, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error || !user) {
    throw createError({ statusCode: 500, statusMessage: 'User not found' })
  }

  if (!user.is_active) {
    throw createError({ statusCode: 403, statusMessage: 'Account deactivated' })
  }

  return {
    id: user.id,
    orgId: user.org_id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    role: user.role as ResolvedUser['role'],
  }
}

async function syncProfile(
  userId: string,
  identity: AuthenticatedIdentity,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const updates: Record<string, string | null> = {}

  if (identity.displayName) {
    updates.display_name = identity.displayName
  }

  if (identity.pictureUrl) {
    const avatarUrl = await syncUserAvatarFromUrl(userId, identity.pictureUrl)
    if (avatarUrl) {
      updates.avatar_url = avatarUrl
    }
  }

  if (Object.keys(updates).length === 0) return

  await supabase.from('users').update(updates).eq('id', userId)
}

export async function resolveUserFromIdentity(
  identity: AuthenticatedIdentity,
  orgSlug: string,
): Promise<ResolvedUser> {
  const supabase = getSupabaseAdmin()
  const orgId = await getOrganizationId(orgSlug)

  const { data: link } = await supabase
    .from('identity_links')
    .select('user_id')
    .eq('provider', identity.provider)
    .eq('provider_subject', identity.providerSubject)
    .maybeSingle()

  if (link) {
    await syncProfile(link.user_id, identity)
    return loadActiveUser(link.user_id)
  }

  const { data: existingByEmail } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', identity.email)
    .maybeSingle()

  if (existingByEmail) {
    await linkIdentity(existingByEmail.id, identity)
    await syncProfile(existingByEmail.id, identity)
    return loadActiveUser(existingByEmail.id)
  }

  throw new LoginAccessError(
    'not_invited',
    'Your account is not authorized.',
  )
}
