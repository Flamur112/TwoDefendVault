export interface FileTreeItem {
  id: string
  name: string
  relativePath: string
  mime: string
  size: number
}

export interface FolderNode {
  name: string
  path: string
  files: FileTreeItem[]
  folders: FolderNode[]
}
