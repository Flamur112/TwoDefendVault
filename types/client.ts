export interface ClientRecord {
  id: string
  orgId: string
  name: string
  slug: string
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  notes: string | null
  logoUrl: string | null
  onboardedAt: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientActivityEntry {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  createdAt: string
  userName: string
}

export interface ClientVaultSummary {
  id: string
  name: string
  description: string | null
  clientId: string | null
  createdAt: string
  itemCount: number
}

export interface ClientStats {
  credentialCount: number
  vaultCount: number
  assetCount: number
  projectCount: number
  expiringLicenseCount: number
  expiredLicenseCount: number
}

export interface ClientSectionRecord {
  id: string
  clientId: string
  section: string
  title: string
  notes: string | null
  metadata: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface OrgSectionRecord extends ClientSectionRecord {
  clientName: string
  clientSlug: string
}
