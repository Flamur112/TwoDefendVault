export interface VaultFileRecord {
  id: string
  vaultId: string
  name: string
  relativePath: string
  mime: string
  size: number
  uploadedAt: string
}

export interface VaultFolderNode {
  name: string
  path: string
  files: VaultFileRecord[]
  folders: VaultFolderNode[]
}
