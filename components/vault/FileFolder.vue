<script setup lang="ts">
import type { VaultFileRecord } from '~/types/vault-file'
import type { FileTreeItem, FolderNode } from '~/types/file-tree'
import { fileSizeLimitMessage } from '~/utils/file-limits'
import { countFilesInFolder } from '~/utils/file-tree'
import { buildVaultFolderTree } from '~/utils/vault-file-tree'
import {
  deleteVaultFile,
  downloadVaultFile,
  downloadVaultFolderZip,
  listVaultFiles,
  uploadVaultFiles,
} from '~/utils/upload-vault-file'

const props = defineProps<{
  vaultId: string
  vaultName: string
  canWrite?: boolean
}>()

const files = ref<VaultFileRecord[]>([])
const loading = ref(true)
const uploading = ref(false)
const downloading = ref(false)
const uploadStatus = ref('')
const error = ref('')
const success = ref('')
const expanded = ref(false)
const closedFolders = ref<Set<string>>(new Set())

const tree = computed(() => buildVaultFolderTree(files.value))
const hasFiles = computed(() => files.value.length > 0)
const totalFileCount = computed(() => countFilesInFolder(tree.value))
const uploadDisabled = computed(() => uploading.value || downloading.value)

function expandAllFolders() {
  closedFolders.value = new Set()
}

function pickUploadableFiles(fileList: FileList | null): File[] {
  if (!fileList) return []
  return [...fileList].filter(file => file.size > 0)
}

async function loadFiles() {
  loading.value = true
  error.value = ''
  try {
    files.value = await listVaultFiles(props.vaultId)
    expandAllFolders()
  }
  catch {
    error.value = 'Failed to load files'
  }
  finally {
    loading.value = false
  }
}

async function toggleExpanded() {
  expanded.value = !expanded.value
  if (expanded.value && files.value.length === 0 && !loading.value) {
    await loadFiles()
  }
}

function toggleFolder(path: string) {
  const next = new Set(closedFolders.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  closedFolders.value = next
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = pickUploadableFiles(input.files)
  input.value = ''
  if (selected.length === 0) {
    error.value = 'No uploadable files selected'
    return
  }

  uploading.value = true
  error.value = ''
  success.value = ''
  uploadStatus.value = ''
  try {
    const { files: added, skipped } = await uploadVaultFiles(props.vaultId, selected, msg => {
      uploadStatus.value = msg
    })
    files.value = [...files.value, ...added]
    expandAllFolders()
    expanded.value = true
    const skippedNote = skipped.length
      ? ` (${skipped.length} skipped — blocked or empty)`
      : ''
    success.value = `Uploaded ${added.length} file${added.length === 1 ? '' : 's'}${skippedNote}`
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  }
  finally {
    uploading.value = false
    uploadStatus.value = ''
  }
}

function findFile(file: FileTreeItem): VaultFileRecord | undefined {
  return files.value.find(item => item.id === file.id)
}

async function removeFile(file: FileTreeItem) {
  const record = findFile(file)
  if (!record) return
  if (!confirm(`Remove ${record.relativePath || record.name}?`)) return
  error.value = ''
  try {
    await deleteVaultFile(props.vaultId, record.id)
    files.value = files.value.filter(item => item.id !== record.id)
  }
  catch {
    error.value = 'Failed to remove file'
  }
}

async function downloadFile(file: FileTreeItem) {
  const record = findFile(file)
  if (!record) return
  try {
    await downloadVaultFile(props.vaultId, record)
  }
  catch {
    error.value = 'Failed to download file'
  }
}

async function downloadFolder(node: FolderNode) {
  downloading.value = true
  error.value = ''
  try {
    const zipName = node.path
      ? `${props.vaultName}-${node.name}.zip`
      : `${props.vaultName}-files.zip`
    await downloadVaultFolderZip(props.vaultId, node.path, zipName, msg => {
      uploadStatus.value = msg
    })
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Download failed'
  }
  finally {
    downloading.value = false
    uploadStatus.value = ''
  }
}

onMounted(() => {
  if (expanded.value) loadFiles()
})
</script>

<template>
  <div class="vault-files">
    <button type="button" class="vault-files-toggle" @click="toggleExpanded">
      <span class="chevron" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
      <span class="label">Files &amp; folders</span>
      <span v-if="hasFiles" class="text-muted count">{{ files.length }}</span>
      <span v-else-if="!loading" class="text-muted count">empty</span>
    </button>

    <div v-if="expanded" class="vault-files-body">
      <p v-if="loading" class="text-muted">Loading files…</p>

      <template v-else>
        <div v-if="hasFiles" class="folder-tree">
          <VaultFolderTreeNode
            :node="tree"
            :can-write="canWrite"
            :closed-folders="closedFolders"
            :downloading="downloading"
            @toggle-folder="toggleFolder"
            @download-file="downloadFile"
            @download-folder="downloadFolder"
            @remove-file="removeFile"
          />
        </div>
        <p v-else class="text-muted empty">No files uploaded yet.</p>

        <div v-if="canWrite" class="upload-actions">
          <label class="btn btn-sm upload-label" :class="{ disabled: uploadDisabled }">
            {{ uploading ? uploadStatus || 'Uploading…' : 'Upload file' }}
            <input
              type="file"
              multiple
              :disabled="uploadDisabled"
              @change="onFilesSelected"
            >
          </label>
          <label class="btn btn-sm upload-label" :class="{ disabled: uploadDisabled }">
            Upload folder
            <input
              type="file"
              webkitdirectory
              directory
              multiple
              :disabled="uploadDisabled"
              @change="onFilesSelected"
            >
          </label>
          <button
            v-if="hasFiles"
            type="button"
            class="btn btn-sm"
            :disabled="uploading || downloading"
            @click="downloadFolder(tree)"
          >
            {{ downloading ? uploadStatus || 'Downloading…' : `Download all (${totalFileCount})` }}
          </button>
        </div>

        <p v-if="canWrite" class="hint text-muted">{{ fileSizeLimitMessage() }}</p>
        <p v-if="uploading" class="status text-muted">{{ uploadStatus || 'Uploading…' }}</p>
        <p v-if="success" class="success">{{ success }}</p>
      </template>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.vault-files {
  margin-top: 0.75rem;
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}

.vault-files-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.vault-files-toggle:hover .label {
  color: var(--primary);
}

.chevron {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.count {
  font-size: 0.75rem;
}

.vault-files-body {
  margin-top: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.folder-tree {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 24rem;
  overflow: auto;
  padding: 0.35rem 0.15rem 0.35rem 0;
}

.upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.upload-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.upload-label.disabled {
  opacity: 0.55;
  pointer-events: none;
  cursor: not-allowed;
}

.upload-label input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}

.hint,
.status,
.empty,
.success {
  margin: 0;
  font-size: 0.75rem;
}

.success {
  color: var(--primary);
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8125rem;
}
</style>
