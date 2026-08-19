<script setup lang="ts">
import {
  attachmentFileLabel,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import { fileSizeLimitMessage, formatFileSize } from '~/utils/file-limits'
import {
  deleteClientFile,
  getClientFileDownloadUrl,
  uploadClientFile,
} from '~/utils/upload-client-file'

const props = defineProps<{
  clientId: string
  modelValue: DocumentAttachment[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DocumentAttachment[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadStatus = ref('')
const error = ref('')

const attachments = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? [...input.files] : []
  input.value = ''
  if (files.length === 0) return

  uploading.value = true
  error.value = ''

  try {
    const added: DocumentAttachment[] = []
    for (const file of files) {
      uploadStatus.value = `Uploading ${file.name}…`
      const attachment = await uploadClientFile(props.clientId, file, msg => {
        uploadStatus.value = msg
      })
      added.push(attachment)
    }
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

async function downloadAttachment(attachment: DocumentAttachment) {
  try {
    const url = await getClientFileDownloadUrl(props.clientId, attachment.id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  catch {
    error.value = 'Failed to open file'
  }
}

async function removeAttachment(attachment: DocumentAttachment) {
  if (!confirm(`Remove ${attachment.name}?`)) return
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
      <span v-if="attachments.length > 0" class="text-muted count">{{ attachments.length }}</span>
    </div>

    <ul v-if="attachments.length > 0" class="attachment-list">
      <li v-for="attachment in attachments" :key="attachment.id" class="attachment-row">
        <button type="button" class="attachment-link" @click="downloadAttachment(attachment)">
          <span class="attachment-type">{{ attachmentFileLabel(attachment.mime, attachment.name) }}</span>
          <span class="attachment-name">{{ attachment.name }}</span>
          <span class="attachment-size text-muted">{{ formatFileSize(attachment.size) }}</span>
        </button>
        <button
          v-if="!readonly"
          type="button"
          class="btn btn-sm btn-danger remove-btn"
          :disabled="uploading"
          @click="removeAttachment(attachment)"
        >
          Remove
        </button>
      </li>
    </ul>

    <p v-else-if="readonly" class="text-muted empty">No files attached.</p>

    <template v-if="!readonly">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="file-input"
        @change="onFilesSelected"
      >
      <button
        type="button"
        class="btn btn-sm upload-btn"
        :disabled="uploading"
        @click="fileInput?.click()"
      >
        {{ uploading ? uploadStatus || 'Uploading…' : 'Upload file' }}
      </button>
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

.attachment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.attachment-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attachment-link {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.attachment-link:hover {
  border-color: var(--primary);
  background: var(--card);
}

.attachment-type {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent-violet);
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.attachment-size {
  font-size: 0.75rem;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
}

.file-input {
  display: none;
}

.upload-btn {
  align-self: flex-start;
}

.hint {
  margin: 0;
  font-size: 0.75rem;
}

.empty {
  margin: 0;
  font-size: 0.8125rem;
}

.error {
  margin: 0;
  color: var(--danger);
  font-size: 0.8125rem;
}
</style>
