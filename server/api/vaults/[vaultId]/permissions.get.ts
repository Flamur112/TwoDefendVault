import { requireVaultAccess } from '../../../utils/authorize'
import { listVaultPermissions } from '../../../utils/vault-permissions'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })
  }

  const user = await requireVaultAccess(event, vaultId, 'read')
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only administrators can view vault access settings' })
  }

  const permissions = await listVaultPermissions(vaultId)
  return { permissions }
})
