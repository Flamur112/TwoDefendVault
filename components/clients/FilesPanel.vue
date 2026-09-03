<script setup lang="ts">
import type { ClientSectionRecord } from '~/types/client'
import type { DocumentAttachment } from '~/utils/document-attachments'
import {
  buildFileLibraryMetadata,
  CLIENT_FILE_LIBRARY_TITLE,
  CLIENT_FILES_MAX,
  isFileLibraryRecord,
  parseFileLibraryAttachments,
} from '~/utils/client-file-library'
import { CLIENT_SECTIONS } from '~/utils/client-sections'
import {
  parseRecordVisibility,
  type RecordVisibility,
} from '~/utils/record-access'

const guide = CLIENT_SECTIONS.files.guide

const { user } = useSession()
const ctx = inject<{ clientId: Ref<string> }>('clientContext')!
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const appSearch = useAppSearch()

useAppSearchPlaceholder('Search files...')

const libraryRecordId = ref<string | null>(null)
const libraryVisibility = ref<RecordVisibility>('all')
const attachments = ref<DocumentAttachment[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const canWrite = computed(() => user.value?.role !== 'readonly')
const isAdmin = computed(() => user.value?.role === 'admin')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ records: ClientSectionRecord[] }>(
      `/api/clients/${clientId.value}/records`,
      { query: { section: 'files' } },
    )

    const library = data.records.find(record => isFileLibraryRecord(record.metadata))
    if (library) {
      libraryRecordId.value = library.id
      libraryVisibility.value = parseRecordVisibility(library.metadata)
      attachments.value = parseFileLibraryAttachments(library.metadata)
    }
    else {
      libraryRecordId.value = null
      libraryVisibility.value = 'all'
      attachments.value = []
    }
  }
  catch (e: unknown) {
    const err = e as { statusMessage?: string }
    error.value = err.statusMessage?.includes('migrate')
      ? err.statusMessage
      : 'Failed to load files'
  }
  finally {
    loading.value = false
  }
}

await load()

async function ensureLibraryRecord(): Promise<string> {
  if (libraryRecordId.value) return libraryRecordId.value

  const data = await $fetch<{ record: ClientSectionRecord }>(
    `/api/clients/${clientId.value}/records`,
    {
      method: 'POST',
      body: {
        section: 'files',
        title: CLIENT_FILE_LIBRARY_TITLE,
        metadata: buildFileLibraryMetadata([]),
      },
    },
  )

  libraryRecordId.value = data.record.id
  return data.record.id
}

async function persistAttachments(next: DocumentAttachment[]) {
  saving.value = true
  error.value = ''
  try {
    const recordId = await ensureLibraryRecord()
    await $fetch(`/api/clients/${clientId.value}/records/${recordId}`, {
      method: 'PATCH',
      body: {
        metadata: buildFileLibraryMetadata(next),
        ...(isAdmin.value ? { visibility: libraryVisibility.value } : {}),
      },
    })
    attachments.value = next
  }
  catch {
    error.value = 'Failed to save files'
    await load()
  }
  finally {
    saving.value = false
  }
}

async function onVisibilityChange(next: RecordVisibility) {
  libraryVisibility.value = next
  if (!libraryRecordId.value || !isAdmin.value) return
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/clients/${clientId.value}/records/${libraryRecordId.value}`, {
      method: 'PATCH',
      body: {
        metadata: buildFileLibraryMetadata(attachments.value),
        visibility: next,
      },
    })
  }
  catch {
    error.value = 'Failed to update access'
    await load()
  }
  finally {
    saving.value = false
  }
}

async function onAttachmentsChange(next: DocumentAttachment[]) {
  if (!canWrite.value) return
  await persistAttachments(next)
}
</script>

<template>
  <div class="files-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="section-title">Files</h2>
        <p v-if="!loading" class="text-muted count-label">
          {{ attachments.length }} {{ attachments.length === 1 ? 'file' : 'files' }}
        </p>
      </div>
    </div>

    <ClientsSectionGuide v-if="!loading && !error" :guide="guide" />

    <ClientsRecordVisibilityField
      v-if="isAdmin && !loading && !error"
      v-model="libraryVisibility"
      @update:model-value="onVisibilityChange"
    />

    <UiPageSearch v-if="!loading && !error" placeholder="Search files..." />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else class="card library-card">
      <DocumentsDocumentAttachments
        :model-value="attachments"
        :client-id="clientId"
        document-title="client-files"
        :readonly="!canWrite"
        :max-attachments="CLIENT_FILES_MAX"
        :filter-query="appSearch.query.value"
        :hint="canWrite ? 'Changes save automatically after each upload or removal.' : null"
        @update:model-value="onAttachmentsChange"
      />

      <p v-if="saving" class="text-muted saving">Saving…</p>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.description {
  margin: 0;
  font-size: 0.8125rem;
  max-width: 36rem;
}

.count-label {
  margin: 0;
  font-size: 0.8125rem;
}

.library-card {
  padding: 1rem;
}

.saving {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
}

.error {
  color: var(--danger);
}
</style>
