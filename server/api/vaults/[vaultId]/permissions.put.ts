import { clearVaultAccessCache, requireRole } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { getSupabaseAdmin } from '../../../utils/supabase'
import {
  isVaultAccessLevel,
  setVaultPermissions,
  type VaultAccessLevel,
} from '../../../utils/vault-permissions'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })
  }

  const user = await requireRole(event, ['admin'])

  const supabase = getSupabaseAdmin()
  const { data: vault } = await supabase
    .from('vaults')
    .select('id, name, org_id, client_id')
    .eq('id', vaultId)
    .maybeSingle()

  if (!vault || vault.org_id !== user.orgId) {
    throw createError({ statusCode: 404, statusMessage: 'Vault not found' })
  }

  const body = await readBody(event)
  const raw = Array.isArray(body?.permissions) ? body.permissions : []
  const permissions: Array<{ userId: string, access: VaultAccessLevel }> = []

  for (const entry of raw) {
    const userId = typeof entry?.userId === 'string' ? entry.userId : ''
    const access = typeof entry?.access === 'string' ? entry.access : ''
    if (!userId || !isVaultAccessLevel(access)) continue
    permissions.push({ userId, access })
  }

  const saved = await setVaultPermissions(vaultId, user.orgId, permissions, user.id)
  clearVaultAccessCache()

  await auditFromEvent(event, {
    user,
    action: 'vault.permissions_update',
    targetType: 'vault',
    targetId: vault.id,
    metadata: {
      vaultName: vault.name,
      clientId: vault.client_id,
      memberCount: saved.length,
    },
  })

  return { permissions: saved }
})
