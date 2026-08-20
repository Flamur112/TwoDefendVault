import { requireAuth } from '../../utils/authorize'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdmin()

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, display_name, role, is_active, created_at, last_login_at, last_login_ip')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load profile' })
  }

  const { data: identityLink } = await supabase
    .from('identity_links')
    .select('provider, linked_at')
    .eq('user_id', user.id)
    .order('linked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    user: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      lastLoginAt: profile.last_login_at,
      lastLoginIp: profile.last_login_ip,
      signInProvider: identityLink?.provider ?? null,
      linkedAt: identityLink?.linked_at ?? null,
    },
  }
})
