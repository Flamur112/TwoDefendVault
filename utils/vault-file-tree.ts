import type { VaultFileRecord } from '~/types/vault-file'
import type { FolderNode } from '~/types/file-tree'
import { buildFolderTree, filesInFolder, folderLabel } from '~/utils/file-tree'

export { filesInFolder, folderLabel }
export type VaultFolderNode = FolderNode

export function buildVaultFolderTree(files: VaultFileRecord[]): FolderNode {
  return buildFolderTree(files.map(file => ({
    id: file.id,
    name: file.name,
    relativePath: file.relativePath,
    mime: file.mime,
    size: file.size,
  })))
}
