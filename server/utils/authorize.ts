import type { H3Event } from 'h3'
import type { SessionUser } from './session'
import { getSessionUser } from './session'
import { getSupabaseAdmin } from './supabase'

const ACCESS_LEVELS = { read: 1, write: 2, admin: 3 } as const

type AccessibleVault = {
  id: string
  name: string
  description: string | null
  client_id: string | null
  created_at: string
}

const vaultCache = new Map<string, { at: number, vaults: AccessibleVault[] }>()
const VAULT_CACHE_MS = 60_000

export async function requireAuth(event: H3Event): Promise<SessionUser> {
  const user = event.context.user ?? await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.user = user
  return user
}

export async function requireRole(
  event: H3Event,
  roles: SessionUser['role'][],
): Promise<SessionUser> {
  const user = await requireAuth(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

async function assertVaultInOrg(vaultId: string, orgId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { data: vault } = await supabase
    .from('vaults')
    .select('org_id')
    .eq('id', vaultId)
    .maybeSingle()

  if (!vault || vault.org_id !== orgId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}

async function loadAccessibleVaults(user: SessionUser): Promise<AccessibleVault[]> {
  const cached = vaultCache.get(user.id)
  if (cached && Date.now() - cached.at < VAULT_CACHE_MS) {
    return cached.vaults
  }

  const supabase = getSupabaseAdmin()

  if (user.role === 'admin') {
    const { data, error } = await supabase
      .from('vaults')
      .select('id, name, description, client_id, created_at')
      .eq('org_id', user.orgId)
      .order('name')

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to list vaults' })
    const vaults = data ?? []
    vaultCache.set(user.id, { at: Date.now(), vaults })
    return vaults
  }

  const { data, error } = await supabase
    .from('vaults')
    .select('id, name, description, client_id, created_at, vault_permissions!inner(access)')
    .eq('org_id', user.orgId)
    .eq('vault_permissions.user_id', user.id)
    .order('name')

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to list vaults' })
  const vaults = data ?? []
  vaultCache.set(user.id, { at: Date.now(), vaults })
  return vaults
}

export async function getAccessibleVaults(user: SessionUser, event?: H3Event) {
  if (event?.context.accessibleVaults) {
    return event.context.accessibleVaults
  }

  const vaults = await loadAccessibleVaults(user)
  if (event) {
    event.context.accessibleVaults = vaults
  }
  return vaults
}

export async function getAccessibleVaultIds(user: SessionUser, event?: H3Event): Promise<string[]> {
  const vaults = await getAccessibleVaults(user, event)
  return vaults.map(vault => vault.id)
}

export async function requireItemAccess(
  event: H3Event,
  itemId: string,
  access: keyof typeof ACCESS_LEVELS,
): Promise<{ user: SessionUser, vaultId: string }> {
  const supabase = getSupabaseAdmin()
  const { data: item } = await supabase
    .from('vault_items')
    .select('vault_id')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const user = await requireVaultAccess(event, item.vault_id, access)
  return { user, vaultId: item.vault_id }
}

export async function requireVaultAccess(
  event: H3Event,
  vaultId: string,
  access: keyof typeof ACCESS_LEVELS,
): Promise<SessionUser> {
  const user = await requireAuth(event)
  await assertVaultInOrg(vaultId, user.orgId)

  if (user.role === 'admin') {
    return user
  }

  const supabase = getSupabaseAdmin()
  const { data: perm } = await supabase
    .from('vault_permissions')
    .select('access')
    .eq('vault_id', vaultId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!perm) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const granted = ACCESS_LEVELS[perm.access as keyof typeof ACCESS_LEVELS]
  const required = ACCESS_LEVELS[access]

  if (!granted || granted < required) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return user
}