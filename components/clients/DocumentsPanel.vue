<script setup lang="ts">
import type { ClientSectionRecord } from '~/types/client'
import {
  buildDocumentMetadata,
  parseDocumentAttachments,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import { DOCUMENT_TYPES, documentExcerpt, getDocumentType } from '~/utils/documents'
import { CLIENT_SECTIONS } from '~/utils/client-sections'
import { parseAllowedUsers, parseRecordVisibility, type RecordVisibility } from '~/utils/record-access'

const guide = CLIENT_SECTIONS.documents.guide

const { user } = useSession()
const ctx = inject<{ clientId: Ref<string> }>('clientContext')!
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const appSearch = useAppSearch()
const router = useRouter()

useAppSearchPlaceholder('Search documents...')

const records = ref<ClientSectionRecord[]>([])
const loading = ref(true)
const error = ref('')

const showForm = ref(false)
const saving = ref(false)
const deleting = ref<ClientSectionRecord | null>(null)
const deletingInProgress = ref(false)

const form = reactive({
  title: '',
  docType: 'Info guide',
  content: '',
  attachments: [] as DocumentAttachment[],
  visibility: 'all' as RecordVisibility,
  allowedUserIds: [] as string[],
})

const canWrite = computed(() => user.value?.role !== 'readonly')
const isAdmin = computed(() => user.value?.role === 'admin')

const filteredRecords = computed(() => {
  if (!appSearch.normalizedQuery.value) return records.value
  return records.value.filter(record =>
    appSearch.matchesSearch(
      record.title,
      record.notes,
      getDocumentType(record.metadata),
      documentExcerpt(record.notes),
    ),
  )
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ records: ClientSectionRecord[] }>(
      `/api/clients/${clientId.value}/records`,
      { query: { section: 'documents' } },
    )
    records.value = data.records
  }
  catch (e: unknown) {
    const err = e as { statusMessage?: string }
    error.value = err.statusMessage?.includes('migrate')
      ? err.statusMessage
      : 'Failed to load documents'
  }
  finally {
    loading.value = false
  }
}

await load()

function resetForm() {
  form.title = ''
  form.docType = 'Info guide'
  form.content = ''
  form.attachments = []
  form.visibility = 'all'
  form.allowedUserIds = []
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function save() {
  if (!form.title.trim()) return
  saving.value = true
  error.value = ''
  try {
    const data = await $fetch<{ record: ClientSectionRecord }>(
      `/api/clients/${clientId.value}/records`,
      {
        method: 'POST',
        body: {
          section: 'documents',
          title: form.title.trim(),
          notes: form.content.trim() || null,
          metadata: buildDocumentMetadata(form.docType, form.attachments),
          ...(isAdmin.value
            ? { visibility: form.visibility, allowedUserIds: form.allowedUserIds }
            : {}),
        },
      },
    )

    closeForm()
    await router.push(`/clients/${clientId.value}/documents/${data.record.id}`)
  }
  catch {
    error.value = 'Failed to create document'
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleting.value) return
  deletingInProgress.value = true
  error.value = ''
  try {
    await $fetch(`/api/clients/${clientId.value}/records/${deleting.value.id}`, {
      method: 'DELETE',
    })
    deleting.value = null
    await load()
  }
  catch {
    error.value = 'Failed to delete document'
  }
  finally {
    deletingInProgress.value = false
  }
}
</script>

<template>
  <div class="documents-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="section-title">Documents</h2>
        <p v-if="!loading && records.length > 0" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${filteredRecords.length} of ${records.length}` : records.length }}
          {{ records.length === 1 ? 'document' : 'documents' }}
        </p>
      </div>
      <div class="toolbar-actions">
        <button v-if="canWrite" type="button" class="btn btn-primary" @click="openCreate">
          New document
        </button>
      </div>
    </div>

    <ClientsSectionGuide v-if="!loading && !error" :guide="guide" />

    <UiPageSearch v-if="!loading && !error" placeholder="Search documents..." />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="records.length === 0" class="card empty">
      <p class="text-muted">No documents yet.</p>
    </div>
    <div v-else-if="filteredRecords.length === 0" class="card empty">
      <p class="text-muted">No documents match your search.</p>
    </div>
    <div v-else class="document-list">
      <DocumentsDocumentCard
        v-for="record in filteredRecords"
        :key="record.id"
        v-memo="[record.id, record.updatedAt, record.notes, record.title]"
        :record="record"
        :client-id="clientId"
        :can-write="canWrite"
        @delete="deleting = record"
      />
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal card">
        <h3>New document</h3>
        <form class="form" @submit.prevent="save">
          <label>
            Title
            <input v-model="form.title" type="text" required placeholder="e.g. VPN setup guide, escalation process">
          </label>
          <label>
            Document type
            <select v-model="form.docType">
              <option v-for="docType in DOCUMENT_TYPES" :key="docType" :value="docType">
                {{ docType }}
              </option>
            </select>
          </label>
          <label>
            Content
            <UiMarkdownEditor
              key="new-document"
              v-model="form.content"
              :client-id="clientId"
            />
          </label>
          <DocumentsDocumentAttachments
            v-model="form.attachments"
            :client-id="clientId"
            :document-title="form.title"
          />
          <ClientsRecordAccessField
            v-if="isAdmin"
            :visibility="form.visibility"
            :allowed-user-ids="form.allowedUserIds"
            @update:visibility="form.visibility = $event"
            @update:allowed-user-ids="form.allowedUserIds = $event"
          />
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeForm">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Creating…' : 'Create document' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="deleting" class="modal-backdrop" @click.self="deleting = null">
      <div class="modal card">
        <h3>Delete document</h3>
        <p>Delete <strong>{{ deleting.title }}</strong>? This cannot be undone.</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="deleting = null">Cancel</button>
          <button type="button" class="btn btn-danger" :disabled="deletingInProgress" @click="confirmDelete">
            {{ deletingInProgress ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
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

.count-label {
  margin: 0;
  font-size: 0.8125rem;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty {
  text-align: center;
  padding: 2rem;
}

.error { color: var(--danger); }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 760px;
  max-height: 92vh;
  overflow-y: auto;
}

.modal h3 { margin: 0 0 1rem; }

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
