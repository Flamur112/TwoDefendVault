export interface VaultSummary {
  id: string
  name: string
  description: string | null
  clientId?: string | null
  createdAt: string
}

export interface VaultItemRecord {
  id: string
  vaultId: string
  itemType: string
  name: string
  url: string | null
  tags: string[] | null
  encryptedData: string
  createdAt: string
  updatedAt: string
}

export type VaultItemType = 'login' | 'api_key' | 'ssh' | 'totp' | 'note' | 'recovery'

export const ITEM_TYPE_LABELS: Record<VaultItemType, string> = {
  login: 'Login',
  api_key: 'API Key',
  ssh: 'SSH',
  totp: 'TOTP',
  note: 'Note',
  recovery: 'Recovery',
}
