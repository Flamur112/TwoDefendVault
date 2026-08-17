import { requireRole } from '../../utils/authorize'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const supabase = getSupabaseAdmin()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, display_name, role, is_active, created_at')
    .eq('org_id', admin.orgId)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to list users' })
  }

  return {
    users: (users ?? []).map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
    })),
  }
})
