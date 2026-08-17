export interface SearchClientResult {
  type: 'client'
  id: string
  name: string
  industry: string | null
  href: string
}

export interface SearchCredentialResult {
  type: 'credential'
  id: string
  name: string
  url: string | null
  itemType: string
  itemTypeLabel: string
  vaultId: string
  vaultName: string
  clientId: string | null
  clientName: string | null
  href: string
}

export interface SearchRecordResult {
  type: 'record'
  id: string
  title: string
  section: string
  sectionLabel: string
  clientId: string
  clientName: string
  href: string
}

export interface GlobalSearchResults {
  clients: SearchClientResult[]
  credentials: SearchCredentialResult[]
  records: SearchRecordResult[]
}
