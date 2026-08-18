import { requireAuth } from '../../utils/authorize'
import { getSupabaseAdmin } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, role, is_active')
    .eq('org_id', user.orgId)
    .eq('is_active', true)
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('email', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load team members' })
  }

  return {
    members: (data ?? []).map(row => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
    })),
  }
})
