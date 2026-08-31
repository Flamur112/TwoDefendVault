<script setup lang="ts">
import type { FileTreeItem, FolderNode } from '~/types/file-tree'
import { attachmentFileLabel } from '~/utils/document-attachments'
import { formatFileSize } from '~/utils/file-limits'
import { countFilesInFolder, folderLabel } from '~/utils/file-tree'

const emit = defineEmits<{
  toggleFolder: [path: string]
  downloadFile: [file: FileTreeItem]
  downloadFolder: [node: FolderNode]
  removeFile: [file: FileTreeItem]
}>()

const props = withDefaults(defineProps<{
  node: FolderNode
  canWrite?: boolean
  closedFolders: Set<string>
  downloading?: boolean
  depth?: number
}>(), {
  depth: 0,
})

const folderFileCount = computed(() => countFilesInFolder(props.node))
const isOpen = computed(() => !props.node.path || !props.closedFolders.has(props.node.path))
</script>

<template>
  <div class="tree-node" :style="{ paddingLeft: `${props.depth * 0.85}rem` }">
    <div
      v-if="node.path || node.folders.length > 0 || node.files.length > 0"
      class="folder-block"
    >
      <div v-if="node.path" class="folder-row">
        <button type="button" class="folder-toggle" @click="emit('toggleFolder', node.path)">
          <span class="chevron">{{ isOpen ? '▾' : '▸' }}</span>
          <span class="folder-name">{{ folderLabel(node.path) }}</span>
          <span class="text-muted folder-count">{{ folderFileCount }} file{{ folderFileCount === 1 ? '' : 's' }}</span>
        </button>
        <button
          type="button"
          class="btn btn-sm folder-download"
          :disabled="downloading"
          @click="emit('downloadFolder', node)"
        >
          Download
        </button>
      </div>

      <template v-if="isOpen">
        <ul v-if="node.files.length > 0" class="file-list">
          <li v-for="file in node.files" :key="file.id" class="file-row">
            <button type="button" class="file-link" @click="emit('downloadFile', file)">
              <span class="file-type">{{ attachmentFileLabel(file.mime, file.name) }}</span>
              <span class="file-name">{{ file.relativePath || file.name }}</span>
              <span class="file-size text-muted">{{ formatFileSize(file.size) }}</span>
            </button>
            <button
              v-if="canWrite"
              type="button"
              class="btn btn-sm btn-danger remove-btn"
              @click="emit('removeFile', file)"
            >
              Remove
            </button>
          </li>
        </ul>

        <VaultFolderTreeNode
          v-for="child in node.folders"
          :key="child.path"
          :node="child"
          :can-write="canWrite"
          :closed-folders="closedFolders"
          :downloading="downloading"
          :depth="props.depth + 1"
          @toggle-folder="emit('toggleFolder', $event)"
          @download-file="emit('downloadFile', $event)"
          @download-folder="emit('downloadFolder', $event)"
          @remove-file="emit('removeFile', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.folder-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.folder-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.folder-name {
  font-size: 0.8125rem;
  font-weight: 600;
}

.folder-count {
  font-size: 0.75rem;
  font-weight: 400;
}

.chevron {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.folder-download {
  flex-shrink: 0;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-link {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.file-link:hover {
  border-color: var(--primary);
  background: var(--card);
}

.file-type {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent-violet);
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
}

.file-size {
  font-size: 0.75rem;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
</style>
