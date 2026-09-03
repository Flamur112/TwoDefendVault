export interface DashboardStats {
  clientCount: number
  favoriteCount: number
  credentialCount: number
  expiringLicenseCount: number
  expiredLicenseCount: number
}

export interface DashboardExpiringLicense {
  id: string
  clientId: string
  clientName: string
  title: string
  expiryStatus: 'expired' | 'soon'
  expiryLabel: string
  href: string
}

export interface DashboardRecentCredential {
  id: string
  name: string
  itemType: string
  itemTypeLabel: string
  vaultName: string
  clientId: string | null
  clientName: string | null
  updatedAt: string
  href: string
}

export interface DashboardActivityEntry {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  createdAt: string
  userName: string
  clientId: string
  clientName: string
}

export interface DashboardData {
  stats: DashboardStats
  favorites: import('~/types/client').ClientRecord[]
  recentCredentials: DashboardRecentCredential[]
  recentActivity: DashboardActivityEntry[]
  expiringLicenses: DashboardExpiringLicense[]
}
