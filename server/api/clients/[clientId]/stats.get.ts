import { requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  await requireClientInOrg(event, clientId)

  const supabase = getSupabaseAdmin()
  const { data: vaults } = await supabase.from('vaults').select('id').eq('client_id', clientId)
  const vaultIds = (vaults ?? []).map(v => v.id)

  let credentialCount = 0
  if (vaultIds.length > 0) {
    const { count } = await supabase
      .from('vault_items')
      .select('id', { count: 'exact', head: true })
      .in('vault_id', vaultIds)
    credentialCount = count ?? 0
  }

  const { count: assetCount, error: assetError } = await supabase
    .from('client_records')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('section', 'assets')

  const { count: projectCount, error: projectError } = await supabase
    .from('client_records')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('section', 'projects')

  const recordsAvailable = !assetError?.message.includes('client_records')
    && !projectError?.message.includes('client_records')

  return {
    stats: {
      credentialCount,
      vaultCount: vaultIds.length,
      assetCount: recordsAvailable ? (assetCount ?? 0) : 0,
      projectCount: recordsAvailable ? (projectCount ?? 0) : 0,
    },
  }
})
