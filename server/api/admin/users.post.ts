import { requireRole } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'

const VALID_ROLES = ['admin', 'member', 'readonly'] as const

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const body = await readBody(event)

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body?.role
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : null

  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  if (!VALID_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', admin.orgId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'User with this email already exists' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      org_id: admin.orgId,
      email,
      display_name: displayName || null,
      role,
    })
    .select('id, email, display_name, role, is_active, created_at')
    .single()

  if (error || !user) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
  }

  await auditFromEvent(event, {
    user: admin,
    action: 'user.create',
    targetType: 'user',
    targetId: user.id,
    metadata: { email: user.email, role: user.role },
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      hasSignedIn: false,
      lastLoginAt: null,
      lastLoginIp: null,
    },
  }
})
