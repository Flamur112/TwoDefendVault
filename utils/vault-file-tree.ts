import type { VaultFileRecord } from '~/types/vault-file'
import { buildFolderTree, collectFolderPaths } from '~/utils/file-tree'

export type { FolderNode as VaultFolderNode } from '~/types/file-tree'

export function buildVaultFolderTree(files: VaultFileRecord[]) {
  return buildFolderTree(files.map(file => ({
    id: file.id,
    name: file.name,
    relativePath: file.relativePath,
    mime: file.mime,
    size: file.size,
  })))
}

export function expandAllFolderPaths(tree: ReturnType<typeof buildFolderTree>): Set<string> {
  return new Set(['', ...collectFolderPaths(tree)])
}
