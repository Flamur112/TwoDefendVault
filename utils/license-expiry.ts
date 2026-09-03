export type LicenseExpiryStatus = 'none' | 'ok' | 'soon' | 'expired'

export interface LicenseExpiryInfo {
  status: LicenseExpiryStatus
  label: string
  daysRemaining: number | null
}

export function getLicenseExpiryInfo(expiresAt: string | undefined): LicenseExpiryInfo {
  if (!expiresAt?.trim()) {
    return { status: 'none', label: '', daysRemaining: null }
  }

  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) {
    return { status: 'none', label: '', daysRemaining: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const msPerDay = 24 * 60 * 60 * 1000
  const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / msPerDay)

  if (daysRemaining < 0) {
    const daysAgo = Math.abs(daysRemaining)
    return {
      status: 'expired',
      label: daysAgo === 0 ? 'Expired today' : `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
      daysRemaining,
    }
  }

  if (daysRemaining === 0) {
    return { status: 'soon', label: 'Expires today', daysRemaining }
  }

  if (daysRemaining <= 30) {
    return {
      status: 'soon',
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      daysRemaining,
    }
  }

  return {
    status: 'ok',
    label: `Expires ${expiry.toLocaleDateString()}`,
    daysRemaining,
  }
}
