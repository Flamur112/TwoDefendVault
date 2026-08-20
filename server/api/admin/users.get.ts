import { requireRole } from '../../utils/authorize'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const supabase = getSupabaseAdmin()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, display_name, role, is_active, created_at, last_login_at, last_login_ip')
    .eq('org_id', admin.orgId)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list users' })
  }

  const userIds = (users ?? []).map(u => u.id)
  const signedInIds = new Set<string>()

  if (userIds.length > 0) {
    const { data: links } = await supabase
      .from('identity_links')
      .select('user_id')
      .in('user_id', userIds)

    for (const link of links ?? []) {
      signedInIds.add(link.user_id)
    }
  }

  return {
    users: (users ?? []).map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      hasSignedIn: signedInIds.has(u.id),
      lastLoginAt: u.last_login_at,
      lastLoginIp: u.last_login_ip,
    })),
  }
})
