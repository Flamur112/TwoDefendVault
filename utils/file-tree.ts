import type { FileTreeItem, FolderNode } from '~/types/file-tree'

function parentFolderPath(relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

function folderNameFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function buildFolderTree(files: FileTreeItem[]): FolderNode {
  const root: FolderNode = { name: '', path: '', files: [], folders: [] }
  const folderMap = new Map<string, FolderNode>([['', root]])

  const ensureFolder = (path: string): FolderNode => {
    const existing = folderMap.get(path)
    if (existing) return existing

    const parentPath = parentFolderPath(path ? `${path}/placeholder` : '')
    const parent = ensureFolder(parentPath)
    const node: FolderNode = {
      name: folderNameFromPath(path),
      path,
      files: [],
      folders: [],
    }
    parent.folders.push(node)
    folderMap.set(path, node)
    return node
  }

  for (const file of files) {
    const folderPath = parentFolderPath(file.relativePath)
    const folder = ensureFolder(folderPath)
    folder.files.push(file)
  }

  const sortTree = (node: FolderNode) => {
    node.files.sort((a, b) => a.name.localeCompare(b.name))
    node.folders.sort((a, b) => a.name.localeCompare(b.name))
    node.folders.forEach(sortTree)
  }
  sortTree(root)

  return root
}

export function filesInFolder(files: FileTreeItem[], folderPath: string): FileTreeItem[] {
  const normalized = folderPath.replace(/^\/+|\/+$/g, '')
  if (!normalized) return files

  return files.filter((file) => {
    const path = file.relativePath
    return path === normalized || path.startsWith(`${normalized}/`)
  })
}

export function folderLabel(path: string): string {
  if (!path) return 'Root'
  return folderNameFromPath(path)
}
