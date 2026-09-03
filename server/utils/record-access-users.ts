import type { RecordAllowedUser } from '../../utils/record-access'
import { getSupabaseAdmin } from './supabase'

export async function resolveAllowedUsers(
  orgId: string,
  userIds: string[],
): Promise<RecordAllowedUser[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, role, is_active')
    .eq('org_id', orgId)
    .in('id', uniqueIds)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to resolve allowed users' })
  }

  return (data ?? [])
    .filter(user => user.is_active && user.role !== 'readonly')
    .map(user => ({
      id: user.id,
      name: user.display_name?.trim() || user.email,
    }))
}
