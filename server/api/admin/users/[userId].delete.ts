import { requireRole } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { revokeAllUserSessions } from '../../../utils/session'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const userId = getRouterParam(event, 'userId')

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  if (userId === admin.id) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot delete your own account' })
  }

  const supabase = getSupabaseAdmin()

  const { data: target, error: fetchError } = await supabase
    .from('users')
    .select('id, org_id, email, display_name, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError || !target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (target.org_id !== admin.orgId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (target.role === 'admin' && target.is_active) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', admin.orgId)
      .eq('role', 'admin')
      .eq('is_active', true)

    if ((count ?? 0) <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot delete the last active admin' })
    }
  }

  await revokeAllUserSessions(userId)

  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete user' })
  }

  await auditFromEvent(event, {
    user: admin,
    action: 'user.delete',
    targetType: 'user',
    targetId: userId,
    metadata: {
      email: target.email,
      role: target.role,
    },
  })

  return { ok: true }
})
