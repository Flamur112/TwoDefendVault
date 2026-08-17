import { requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { logClientActivity } from '../../../utils/clients'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)
  if (user.role === 'readonly') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : null

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Vault name is required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: vault, error } = await supabase
    .from('vaults')
    .insert({
      org_id: user.orgId,
      client_id: clientId,
      name,
      description: description || null,
      created_by: user.id,
    })
    .select('id, name, description, client_id, created_at')
    .single()

  if (error || !vault) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create vault' })
  }

  await supabase.from('vault_permissions').upsert({
    vault_id: vault.id,
    user_id: user.id,
    access: 'admin',
    granted_by: user.id,
  }, { onConflict: 'vault_id,user_id' })

  await logClientActivity(clientId, user.id, 'vault_added', { vaultName: name })

  return {
    vault: {
      id: vault.id,
      name: vault.name,
      description: vault.description,
      clientId: vault.client_id,
      createdAt: vault.created_at,
    },
  }
})
