import { getSupabaseAdmin } from './supabase'

export type VaultAccessLevel = 'read' | 'write' | 'admin'

export const VAULT_ACCESS_LEVELS: VaultAccessLevel[] = ['read', 'write', 'admin']

export interface VaultPermissionEntry {
  userId: string
  email: string
  displayName: string | null
  role: string
  access: VaultAccessLevel
  grantedAt: string
}

export function isVaultAccessLevel(value: string): value is VaultAccessLevel {
  return VAULT_ACCESS_LEVELS.includes(value as VaultAccessLevel)
}

export async function listVaultPermissions(vaultId: string): Promise<VaultPermissionEntry[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('vault_permissions')
    .select(`
      access,
      granted_at,
      user_id,
      users!inner(id, email, display_name, role, is_active)
    `)
    .eq('vault_id', vaultId)
    .order('granted_at')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load vault access' })
  }

  return (data ?? [])
    .map((row) => {
      const userRow = Array.isArray(row.users) ? row.users[0] : row.users
      if (!userRow?.is_active) return null
      return {
        userId: userRow.id,
        email: userRow.email,
        displayName: userRow.display_name,
        role: userRow.role,
        access: row.access as VaultAccessLevel,
        grantedAt: row.granted_at,
      }
    })
    .filter((entry): entry is VaultPermissionEntry => entry !== null)
}

export async function setVaultPermissions(
  vaultId: string,
  orgId: string,
  permissions: Array<{ userId: string, access: VaultAccessLevel }>,
  grantedBy: string,
): Promise<VaultPermissionEntry[]> {
  const supabase = getSupabaseAdmin()

  const unique = new Map<string, VaultAccessLevel>()
  for (const entry of permissions) {
    if (!entry.userId || !isVaultAccessLevel(entry.access)) continue
    unique.set(entry.userId, entry.access)
  }

  const userIds = [...unique.keys()]
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('org_id', orgId)
      .in('id', userIds)

    const allowed = new Set(
      (users ?? [])
        .filter(u => u.is_active && u.role !== 'readonly')
        .map(u => u.id),
    )

    for (const userId of userIds) {
      if (!allowed.has(userId)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Vault access can only be granted to active members or admins',
        })
      }
    }
  }

  const { error: deleteError } = await supabase
    .from('vault_permissions')
    .delete()
    .eq('vault_id', vaultId)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update vault access' })
  }

  if (userIds.length > 0) {
    const { error: insertError } = await supabase.from('vault_permissions').insert(
      userIds.map(userId => ({
        vault_id: vaultId,
        user_id: userId,
        access: unique.get(userId)!,
        granted_by: grantedBy,
      })),
    )

    if (insertError) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to save vault access' })
    }
  }

  return listVaultPermissions(vaultId)
}
