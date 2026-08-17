import { requireVaultAccess } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { logClientActivity } from '../../../utils/clients'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })

  const user = await requireVaultAccess(event, vaultId, 'write')
  if (user.role === 'readonly') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const { data: vault } = await supabase
    .from('vaults')
    .select('id, name, client_id')
    .eq('id', vaultId)
    .maybeSingle()

  if (!vault) {
    throw createError({ statusCode: 404, statusMessage: 'Vault not found' })
  }

  const { error } = await supabase.from('vaults').delete().eq('id', vaultId)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete vault' })
  }

  if (vault.client_id) {
    await logClientActivity(vault.client_id, user.id, 'vault_deleted', {
      vaultName: vault.name,
    })
  }

  await auditFromEvent(event, {
    user,
    action: 'vault.delete',
    targetType: 'vault',
    targetId: vault.id,
    metadata: { name: vault.name },
  })

  return { success: true, deleted: { id: vault.id, name: vault.name } }
})
