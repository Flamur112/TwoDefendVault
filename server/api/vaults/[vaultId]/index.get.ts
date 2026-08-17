import { requireVaultAccess } from '../../../utils/authorize'
import { auditFromEvent } from '../../../utils/audit'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const vaultId = getRouterParam(event, 'vaultId')
  if (!vaultId) {
    throw createError({ statusCode: 400, statusMessage: 'Vault ID required' })
  }

  const user = await requireVaultAccess(event, vaultId, 'read')

  const supabase = getSupabaseAdmin()
  const { data: vault, error } = await supabase
    .from('vaults')
    .select('id, name, description, client_id, created_at')
    .eq('id', vaultId)
    .single()

  if (error || !vault) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await auditFromEvent(event, {
    user,
    action: 'vault.open',
    targetType: 'vault',
    targetId: vault.id,
    metadata: { name: vault.name },
  })

  return {
    vault: {
      id: vault.id,
      name: vault.name,
      description: vault.description,
      clientId: vault.client_id ?? null,
      createdAt: vault.created_at,
    },
  }
})
