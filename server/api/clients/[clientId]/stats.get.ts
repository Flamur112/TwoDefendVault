import { requireClientInOrg } from '../../../utils/client-map'
import { filterVisibleProjects } from '../../../utils/project-access'
import { listClientLicenseSummary } from '../../../utils/org-licenses'
import { getSupabaseAdmin } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user } = await requireClientInOrg(event, clientId)

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

  const { data: projectRows, error: projectError } = await supabase
    .from('client_records')
    .select('metadata')
    .eq('client_id', clientId)
    .eq('section', 'projects')

  const recordsAvailable = !assetError?.message.includes('client_records')
    && !projectError?.message.includes('client_records')

  const projectCount = recordsAvailable
    ? filterVisibleProjects(user, projectRows ?? []).length
    : 0

  let licenseSummary = { expiringCount: 0, expiredCount: 0, attention: [] as Awaited<ReturnType<typeof listClientLicenseSummary>>['attention'] }
  if (recordsAvailable) {
    try {
      licenseSummary = await listClientLicenseSummary(user, clientId)
    }
    catch {
      // Non-blocking if licenses unavailable
    }
  }

  return {
    stats: {
      credentialCount,
      vaultCount: vaultIds.length,
      assetCount: recordsAvailable ? (assetCount ?? 0) : 0,
      projectCount,
      expiringLicenseCount: licenseSummary.expiringCount,
      expiredLicenseCount: licenseSummary.expiredCount,
    },
    licenseAlerts: licenseSummary.attention,
  }
})
