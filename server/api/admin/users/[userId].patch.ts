import { requireRole } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { revokeAllUserSessions } from '../../../utils/session'
import { getSupabaseAdmin } from '../../../utils/supabase'

const VALID_ROLES = ['admin', 'member', 'readonly'] as const

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const userId = getRouterParam(event, 'userId')
  const body = await readBody(event)

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: target, error: fetchError } = await supabase
    .from('users')
    .select('id, org_id, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError || !target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (target.org_id !== admin.orgId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const updates: Record<string, unknown> = {}

  if (body?.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
    }

    if (target.id === admin.id && body.role !== 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', admin.orgId)
        .eq('role', 'admin')
        .eq('is_active', true)

      if ((count ?? 0) <= 1) {
        throw createError({ statusCode: 400, statusMessage: 'Cannot remove the last active admin' })
      }
    }

    updates.role = body.role
  }

  if (body?.displayName !== undefined) {
    updates.display_name = typeof body.displayName === 'string'
      ? body.displayName.trim() || null
      : null
  }

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'isActive must be a boolean' })
    }

    if (target.id === admin.id && body.isActive === false) {
      throw createError({ statusCode: 400, statusMessage: 'Cannot deactivate your own account' })
    }

    if (target.role === 'admin' && body.isActive === false) {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', admin.orgId)
        .eq('role', 'admin')
        .eq('is_active', true)

      if ((count ?? 0) <= 1) {
        throw createError({ statusCode: 400, statusMessage: 'Cannot deactivate the last active admin' })
      }
    }

    updates.is_active = body.isActive
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  const { data: user, error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, email, display_name, role, is_active, created_at')
    .single()

  if (updateError || !user) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update user' })
  }

  if (updates.is_active === false) {
    await revokeAllUserSessions(userId)
  }

  const changedFields = Object.keys(updates)
  await auditFromEvent(event, {
    user: admin,
    action: updates.is_active === false ? 'user.deactivate' : 'user.update',
    targetType: 'user',
    targetId: user.id,
    metadata: {
      email: user.email,
      changedFields: changedFields.join(','),
      ...(updates.role ? { role: updates.role as string } : {}),
    },
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
    },
  }
})
