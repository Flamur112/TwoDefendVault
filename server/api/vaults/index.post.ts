import { requireAuth } from '../../utils/authorize'
import { getSupabaseAdmin } from '../../utils/supabase'
import { logClientActivity } from '../../utils/clients'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (user.role === 'readonly') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : null
  const clientId = typeof body?.clientId === 'string' ? body.clientId : null

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Vault name is required' })
  }

  const supabase = getSupabaseAdmin()

  if (clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('org_id', user.orgId)
      .maybeSingle()
    if (!client) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

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

  if (clientId) {
    await logClientActivity(clientId, user.id, 'vault_added', { vaultName: name })
  }

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
