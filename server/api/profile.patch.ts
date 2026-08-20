import { requireAuth } from '../utils/authorize'
import { auditFromEvent } from '../utils/audit'
import { getSupabaseAdmin } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const displayName = typeof body?.displayName === 'string'
    ? body.displayName.trim() || null
    : undefined

  if (displayName === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'displayName is required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: updated, error } = await supabase
    .from('users')
    .update({ display_name: displayName })
    .eq('id', user.id)
    .select('id, email, display_name, avatar_url, role, is_active, created_at, last_login_at, last_login_ip')
    .single()

  if (error || !updated) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update profile' })
  }

  await auditFromEvent(event, {
    user,
    action: 'user.update',
    targetType: 'user',
    targetId: user.id,
    metadata: {
      email: updated.email,
      changedFields: 'displayName',
      selfService: true,
    },
  })

  return {
    user: {
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url,
      role: updated.role,
      isActive: updated.is_active,
      createdAt: updated.created_at,
      lastLoginAt: updated.last_login_at,
      lastLoginIp: updated.last_login_ip,
    },
  }
})
