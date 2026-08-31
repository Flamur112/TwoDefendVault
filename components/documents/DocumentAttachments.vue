<script setup lang="ts">
import {
  attachmentRelativePath,
  DOCUMENT_ATTACHMENTS_MAX,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import { fileSizeLimitMessage } from '~/utils/file-limits'
import { buildFolderTree } from '~/utils/file-tree'
import type { FileTreeItem, FolderNode } from '~/types/file-tree'
import {
  deleteClientFile,
  downloadClientAttachment,
  downloadClientAttachmentFolderZip,
  uploadClientFile,
  uploadClientFiles,
} from '~/utils/upload-client-file'

const props = defineProps<{
  clientId: string
  modelValue: DocumentAttachment[]
  readonly?: boolean
  documentTitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DocumentAttachment[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const downloading = ref(false)
const uploadStatus = ref('')
const error = ref('')
const openFolders = ref<Set<string>>(new Set(['']))

const attachments = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const tree = computed(() => buildFolderTree(
  attachments.value.map(attachment => ({
    id: attachment.id,
    name: attachment.name,
    relativePath: attachmentRelativePath(attachment),
    mime: attachment.mime,
    size: attachment.size,
  })),
))

const remainingSlots = computed(() =>
  Math.max(0, DOCUMENT_ATTACHMENTS_MAX - attachments.value.length),
)

async function onFilesSelected(event: Event, fromFolder = false) {
  const input = event.target as HTMLInputElement
  const files = input.files ? [...input.files] : []
  input.value = ''
  if (files.length === 0) return

  if (files.length > remainingSlots.value) {
    error.value = `Only ${remainingSlots.value} attachment slot${remainingSlots.value === 1 ? '' : 's'} left (max ${DOCUMENT_ATTACHMENTS_MAX})`
    return
  }

  uploading.value = true
  error.value = ''

  try {
    const added = fromFolder || files.length > 1
      ? await uploadClientFiles(props.clientId, files, msg => {
          uploadStatus.value = msg
        })
      : [await uploadClientFile(props.clientId, files[0], msg => {
          uploadStatus.value = msg
        })]

    attachments.value = [...attachments.value, ...added]
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  }
  finally {
    uploading.value = false
    uploadStatus.value = ''
  }
}

function toggleFolder(path: string) {
  const next = new Set(openFolders.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  openFolders.value = next
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
    await downloadClientAttachment(props.clientId, attachment)
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
      props.clientId,
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
    await deleteClientFile(props.clientId, attachment.id)
    attachments.value = attachments.value.filter(item => item.id !== attachment.id)
  }
  catch {
    error.value = 'Failed to remove file'
  }
}
</script>

<template>
  <div class="attachments">
    <div class="attachments-head">
      <span class="attachments-label">Attachments</span>
      <span v-if="attachments.length > 0" class="text-muted count">
        {{ attachments.length }} / {{ DOCUMENT_ATTACHMENTS_MAX }}
      </span>
    </div>

    <div v-if="attachments.length > 0" class="folder-tree">
      <VaultFolderTreeNode
        :node="tree"
        :can-write="!readonly"
        :open-folders="openFolders"
        :downloading="downloading"
        @toggle-folder="toggleFolder"
        @download-file="downloadFileItem"
        @download-folder="downloadFolder"
        @remove-file="removeFileItem"
      />
    </div>

    <p v-else-if="readonly" class="text-muted empty">No files attached.</p>

    <template v-if="!readonly">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="file-input"
        @change="onFilesSelected($event, false)"
      >
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        directory
        multiple
        class="file-input"
        @change="onFilesSelected($event, true)"
      >
      <div class="upload-actions">
        <button
          type="button"
          class="btn btn-sm upload-btn"
          :disabled="uploading || downloading || remainingSlots === 0"
          @click="fileInput?.click()"
        >
          Upload file
        </button>
        <button
          type="button"
          class="btn btn-sm upload-btn"
          :disabled="uploading || downloading || remainingSlots === 0"
          @click="folderInput?.click()"
        >
          Upload folder
        </button>
        <button
          v-if="attachments.length > 0"
          type="button"
          class="btn btn-sm upload-btn"
          :disabled="uploading || downloading"
          @click="downloadFolder(tree)"
        >
          {{ downloading ? uploadStatus || 'Downloading…' : 'Download all' }}
        </button>
      </div>
      <p v-if="uploading" class="status text-muted">{{ uploadStatus || 'Uploading…' }}</p>
      <p class="hint text-muted">{{ fileSizeLimitMessage() }}</p>
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
}

.upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.file-input {
  display: none;
}

.upload-btn {
  align-self: flex-start;
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

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8125rem;
}
</style>
