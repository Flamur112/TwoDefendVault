import { requireAuth } from '../../utils/authorize'
import { listOrgLicenses } from '../../utils/org-licenses'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const mode = query.all === '1' || query.all === 'true' ? 'all' : 'attention'
  const expiringWithinDays = typeof query.days === 'string'
    ? Number.parseInt(query.days, 10)
    : 30

  const licenses = await listOrgLicenses(user, {
    mode,
    expiringWithinDays: Number.isFinite(expiringWithinDays) ? expiringWithinDays : 30,
  })

  return {
    licenses,
    expiringCount: licenses.filter(l => l.expiryStatus === 'soon').length,
    expiredCount: licenses.filter(l => l.expiryStatus === 'expired').length,
  }
})
