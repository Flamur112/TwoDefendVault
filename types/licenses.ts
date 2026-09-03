import type { LicenseExpiryStatus } from '~/utils/license-expiry'

export interface OrgLicenseRow {
  id: string
  clientId: string
  clientName: string
  title: string
  vendor: string | null
  expiresAt: string | null
  expiryStatus: LicenseExpiryStatus
  expiryLabel: string
  daysRemaining: number | null
  href: string
}

export interface OrgLicensesResponse {
  licenses: OrgLicenseRow[]
  expiringCount: number
  expiredCount: number
}
