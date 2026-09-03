<script setup lang="ts">
import {
  attachmentRelativePath,
  DOCUMENT_ATTACHMENTS_MAX,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import { fileSizeLimitMessage } from '~/utils/file-limits'
import { buildFolderTree, collectFolderPaths, countFilesInFolder } from '~/utils/file-tree'
import type { FileTreeItem, FolderNode } from '~/types/file-tree'
import {
  deleteClientFile,
  downloadClientAttachment,
  downloadClientAttachmentFolderZip,
  uploadClientFile,
  uploadClientFiles,
} from '~/utils/upload-client-file'

const props = withDefaults(defineProps<{
  clientId: string
  modelValue: DocumentAttachment[]
  readonly?: boolean
  documentTitle?: string
  maxAttachments?: number
  hint?: string | null
  filterQuery?: string
}>(), {
  hint: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: DocumentAttachment[]]
}>()

const uploading = ref(false)
const downloading = ref(false)
const uploadStatus = ref('')
const error = ref('')
const success = ref('')
const closedFolders = ref<Set<string>>(new Set())

const clientIdValue = computed(() => String(props.clientId ?? ''))

const attachments = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const tree = computed(() => {
  const query = props.filterQuery?.trim().toLowerCase() ?? ''
  const items = attachments.value.map(attachment => ({
    id: attachment.id,
    name: attachment.name,
    relativePath: attachmentRelativePath(attachment),
    mime: attachment.mime,
    size: attachment.size,
  }))

  if (!query) {
    return buildFolderTree(items)
  }

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(query)
    || item.relativePath.toLowerCase().includes(query),
  )

  return buildFolderTree(filtered)
})

const hasVisibleFiles = computed(() => countFilesInFolder(tree.value) > 0)

const totalFileCount = computed(() => countFilesInFolder(tree.value))
const folderCount = computed(() => collectFolderPaths(tree.value).length)

const attachmentLimit = computed(() => props.maxAttachments ?? DOCUMENT_ATTACHMENTS_MAX)

const remainingSlots = computed(() =>
  Math.max(0, attachmentLimit.value - attachments.value.length),
)

const uploadDisabled = computed(() =>
  uploading.value || downloading.value || remainingSlots.value === 0 || !clientIdValue.value,
)

function expandAllFolders() {
  closedFolders.value = new Set()
}

function toggleFolder(path: string) {
  const next = new Set(closedFolders.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  closedFolders.value = next
}

function pickUploadableFiles(fileList: FileList | null): File[] {
  if (!fileList) return []
  const picked = [...fileList].filter(file => file.size > 0)
  const skipped = fileList.length - picked.length
  if (skipped > 0 && picked.length === 0) {
    throw new Error('Selected folder has no uploadable files')
  }
  if (skipped > 0) {
    uploadStatus.value = `Skipping ${skipped} empty file${skipped === 1 ? '' : 's'}…`
  }
  return picked
}

async function onFilesSelected(event: Event, fromFolder = false) {
  const input = event.target as HTMLInputElement
  let files: File[] = []
  try {
    files = pickUploadableFiles(input.files)
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'No files selected'
    input.value = ''
    return
  }
  input.value = ''
  if (files.length === 0) return

  if (files.length > remainingSlots.value) {
    error.value = `Only ${remainingSlots.value} attachment slot${remainingSlots.value === 1 ? '' : 's'} left (max ${attachmentLimit.value})`
    return
  }

  uploading.value = true
  error.value = ''
  success.value = ''
  uploadStatus.value = ''

  try {
    const { attachments: added, skipped } = fromFolder || files.length > 1
      ? await uploadClientFiles(clientIdValue.value, files, msg => {
          uploadStatus.value = msg
        })
      : { attachments: [await uploadClientFile(clientIdValue.value, files[0], msg => {
          uploadStatus.value = msg
        })], skipped: [] }

    attachments.value = [...attachments.value, ...added]
    expandAllFolders()
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

function findAttachment(file: FileTreeItem): DocumentAttachment | undefined {
  return attachments.value.find(item => item.id === file.id)
}

async function downloadFileItem(file: FileTreeItem) {
  const attachment = findAttachment(file)
  if (!attachment) return
  await downloadAttachment(attachment)
}

async function removeFileItem(file: FileTreeItem) {
  const attachment = findAttachment(file)
  if (!attachment) return
  await removeAttachment(attachment)
}

async function downloadAttachment(attachment: DocumentAttachment) {
  try {
    await downloadClientAttachment(clientIdValue.value, attachment)
  }
  catch {
    error.value = 'Failed to open file'
  }
}

async function downloadFolder(node: FolderNode) {
  downloading.value = true
  error.value = ''
  try {
    const baseName = (props.documentTitle || 'document').replace(/[^\w\s.-]/g, '').trim() || 'document'
    const zipName = node.path ? `${baseName}-${node.name}.zip` : `${baseName}-files.zip`
    await downloadClientAttachmentFolderZip(
      clientIdValue.value,
      attachments.value,
      node,
      zipName,
      msg => { uploadStatus.value = msg },
    )
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Download failed'
  }
  finally {
    downloading.value = false
    uploadStatus.value = ''
  }
}

async function removeAttachment(attachment: DocumentAttachment) {
  if (!confirm(`Remove ${attachmentRelativePath(attachment)}?`)) return
  error.value = ''
  try {
    await deleteClientFile(clientIdValue.value, attachment.id)
    attachments.value = attachments.value.filter(item => item.id !== attachment.id)
  }
  catch {
    error.value = 'Failed to remove file'
  }
}

watch(
  () => attachments.value.length,
  () => expandAllFolders(),
  { immediate: true },
)
</script>

<template>
  <div class="attachments">
    <div class="attachments-head">
      <span class="attachments-label">Attachments</span>
      <span v-if="attachments.length > 0" class="text-muted count">
        {{ attachments.length }} / {{ attachmentLimit }}
        <template v-if="folderCount > 0"> · {{ folderCount }} folder{{ folderCount === 1 ? '' : 's' }}</template>
      </span>
    </div>

    <div v-if="attachments.length > 0 && hasVisibleFiles" class="folder-tree">
      <VaultFolderTreeNode
        :node="tree"
        :can-write="!readonly"
        :closed-folders="closedFolders"
        :downloading="downloading"
        @toggle-folder="toggleFolder"
        @download-file="downloadFileItem"
        @download-folder="downloadFolder"
        @remove-file="removeFileItem"
      />
    </div>

    <p v-else-if="attachments.length > 0 && filterQuery?.trim()" class="text-muted empty">
      No files match your search.
    </p>
    <p v-else-if="readonly" class="text-muted empty">No files attached.</p>

    <template v-if="!readonly">
      <div class="upload-actions">
        <label class="btn btn-sm upload-label" :class="{ disabled: uploadDisabled }">
          {{ uploading ? uploadStatus || 'Uploading…' : 'Upload file' }}
          <input
            type="file"
            multiple
            :disabled="uploadDisabled"
            @change="onFilesSelected($event, false)"
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
            @change="onFilesSelected($event, true)"
          >
        </label>
        <button
          v-if="attachments.length > 0"
          type="button"
          class="btn btn-sm"
          :disabled="uploading || downloading"
          @click="downloadFolder(tree)"
        >
          {{ downloading ? uploadStatus || 'Downloading…' : `Download all (${totalFileCount})` }}
        </button>
      </div>
      <p v-if="uploading" class="status text-muted">{{ uploadStatus || 'Uploading…' }}</p>
      <p v-if="success" class="success">{{ success }}</p>
      <p v-if="hint !== null" class="hint text-muted">{{ hint ?? `${fileSizeLimitMessage()} Save the document to keep attachments.` }}</p>
    </template>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.attachments {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachments-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attachments-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.count {
  font-size: 0.75rem;
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
.empty {
  margin: 0;
  font-size: 0.75rem;
}

.empty {
  font-size: 0.8125rem;
}

.success {
  margin: 0;
  color: var(--primary);
  font-size: 0.8125rem;
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8125rem;
}
</style>
