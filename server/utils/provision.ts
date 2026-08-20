import type { AuthenticatedIdentity } from './identity/types'
import { assertEmailDomainAllowed, LoginAccessError } from './auth-access'
import { getSupabaseAdmin } from './supabase'

export interface ResolvedUser {
  id: string
  orgId: string
  email: string
  displayName: string | null
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
    .select('id, org_id, email, display_name, role, is_active')
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
    role: user.role as ResolvedUser['role'],
  }
}

async function syncProfile(
  userId: string,
  identity: AuthenticatedIdentity,
): Promise<void> {
  if (!identity.displayName) return

  const supabase = getSupabaseAdmin()
  await supabase
    .from('users')
    .update({ display_name: identity.displayName })
    .eq('id', userId)
}

export async function resolveUserFromIdentity(
  identity: AuthenticatedIdentity,
  orgSlug: string,
): Promise<ResolvedUser> {
  assertEmailDomainAllowed(identity.email)

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
    'Your account is not authorized. Ask an administrator to add you in Admin → Users.',
  )
}

export { LoginAccessError }
