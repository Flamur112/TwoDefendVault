<script setup lang="ts">
import type { ClientActivityEntry, ClientSectionRecord } from '~/types/client'
import {
  buildDocumentMetadata,
  parseDocumentAttachments,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import { DOCUMENT_TYPES, getDocumentType } from '~/utils/documents'
import { formatClientActivityEntry } from '~/utils/client-activity'
import { formatProjectTimestamp, formatProjectWhen } from '~/utils/projects'

const route = useRoute()
const router = useRouter()
const { user } = useSession()
const ctx = inject<{ clientId: Ref<string> }>('clientContext')!
const clientId = ctx.clientId
const apiFetch = useApiFetch()

const documentId = computed(() => route.params.documentId as string)
const canWrite = computed(() => user.value?.role !== 'readonly')

type DocumentRecord = ClientSectionRecord & { createdByName?: string | null }

const record = ref<DocumentRecord | null>(null)
const activity = ref<ClientActivityEntry[]>([])
const loading = ref(true)
const loadingActivity = ref(true)
const error = ref('')
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const saveError = ref('')

const form = reactive({
  title: '',
  docType: 'Info guide',
  content: '',
  attachments: [] as DocumentAttachment[],
})

const backLink = computed(() => `/clients/${clientId.value}/documents`)

const viewAttachments = computed(() =>
  record.value ? parseDocumentAttachments(record.value.metadata) : [],
)

function syncFormFromRecord(doc: DocumentRecord) {
  form.title = doc.title
  form.docType = getDocumentType(doc.metadata)
  form.content = doc.notes ?? ''
  form.attachments = parseDocumentAttachments(doc.metadata)
}

async function loadRecord() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ record: DocumentRecord }>(
      `/api/clients/${clientId.value}/records/${documentId.value}`,
    )
    if (data.record.section !== 'documents') {
      error.value = 'This record is not a document.'
      record.value = null
      return
    }
    record.value = data.record
    syncFormFromRecord(data.record)
  }
  catch {
    error.value = 'Document not found or access denied.'
    record.value = null
  }
  finally {
    loading.value = false
  }
}

async function loadActivity() {
  loadingActivity.value = true
  try {
    const data = await apiFetch<{ activity: ClientActivityEntry[] }>(
      `/api/clients/${clientId.value}/records/${documentId.value}/activity`,
    )
    activity.value = data.activity
  }
  catch {
    activity.value = []
  }
  finally {
    loadingActivity.value = false
  }
}

async function logView() {
  try {
    await $fetch(`/api/clients/${clientId.value}/records/${documentId.value}/view`, {
      method: 'POST',
    })
    await loadActivity()
  }
  catch {
    // Non-blocking
  }
}

function startEdit() {
  if (!record.value || !canWrite.value) return
  syncFormFromRecord(record.value)
  isEditing.value = true
  saveError.value = ''
}

function cancelEdit() {
  if (record.value) syncFormFromRecord(record.value)
  isEditing.value = false
  saveError.value = ''
}

async function save() {
  if (!record.value || !form.title.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    const data = await $fetch<{ record: DocumentRecord }>(
      `/api/clients/${clientId.value}/records/${documentId.value}`,
      {
        method: 'PATCH',
        body: {
          title: form.title.trim(),
          notes: form.content.trim() || null,
          metadata: buildDocumentMetadata(form.docType, form.attachments, record.value.metadata),
        },
      },
    )
    record.value = { ...data.record, createdByName: record.value.createdByName }
    syncFormFromRecord(data.record)
    isEditing.value = false
    await loadActivity()
  }
  catch {
    saveError.value = 'Failed to save document'
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!record.value || !confirm(`Delete "${record.value.title}"? This cannot be undone.`)) return
  deleting.value = true
  try {
    await $fetch(`/api/clients/${clientId.value}/records/${documentId.value}`, {
      method: 'DELETE',
    })
    await router.push(backLink.value)
  }
  catch {
    saveError.value = 'Failed to delete document'
  }
  finally {
    deleting.value = false
  }
}

function formatActivityDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

await loadRecord()
if (record.value) {
  await Promise.all([logView(), loadActivity()])
}
else {
  loadingActivity.value = false
}

watch(documentId, async () => {
  isEditing.value = false
  await loadRecord()
  if (record.value) {
    await Promise.all([logView(), loadActivity()])
  }
})
</script>

<template>
  <div class="document-detail">
    <header class="detail-header">
      <NuxtLink :to="backLink" class="back text-muted">← Back to documents</NuxtLink>

      <div v-if="loading" class="header-body">
        <p class="text-muted">Loading document…</p>
      </div>

      <div v-else-if="error" class="header-body">
        <p class="error">{{ error }}</p>
      </div>

      <template v-else-if="record">
        <div class="header-body">
          <div class="title-row">
            <div class="title-copy">
              <h2 class="page-title">{{ isEditing ? 'Edit document' : record.title }}</h2>
              <p v-if="!isEditing" class="meta text-muted">
                <span class="type-badge">{{ getDocumentType(record.metadata) }}</span>
                Updated {{ formatProjectWhen(record.updatedAt) }}
                ({{ formatProjectTimestamp(record.updatedAt) }})
                <span v-if="record.createdByName"> · Created by {{ record.createdByName }}</span>
              </p>
            </div>
            <div v-if="canWrite && !isEditing" class="header-actions">
              <button type="button" class="btn btn-sm" @click="startEdit">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" :disabled="deleting" @click="confirmDelete">
                {{ deleting ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </header>

    <div v-if="!loading && !error && record" class="detail-layout">
      <main class="detail-main card">
        <form v-if="isEditing" class="edit-form" @submit.prevent="save">
          <label>
            Title
            <input v-model="form.title" type="text" required>
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
              :key="documentId"
              v-model="form.content"
              :client-id="clientId"
            />
          </label>
          <DocumentsDocumentAttachments
            v-model="form.attachments"
            :client-id="clientId"
          />
          <p v-if="saveError" class="error">{{ saveError }}</p>
          <div class="form-actions">
            <button type="button" class="btn" @click="cancelEdit">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </form>

        <div v-else class="document-body">
          <DocumentsDocumentAttachments
            v-if="viewAttachments.length > 0"
            :model-value="viewAttachments"
            :client-id="clientId"
            readonly
          />
          <p v-if="!record.notes?.trim() && !viewAttachments.length && record.metadata.url" class="legacy-note text-muted">
            This older entry only has an external link.
            <a :href="record.metadata.url" target="_blank" rel="noopener">Open link</a>
          </p>
          <UiMarkdownContent v-if="record.notes?.trim()" :source="record.notes" />
          <p v-else-if="!viewAttachments.length && !record.metadata.url" class="text-muted empty-body">
            No content yet.
          </p>
        </div>
      </main>

      <aside class="detail-sidebar card">
        <h3 class="sidebar-title">Activity</h3>
        <p class="retention-note text-muted">Views, edits, and changes in the last 14 days</p>
        <p v-if="loadingActivity" class="text-muted">Loading activity…</p>
        <p v-else-if="activity.length === 0" class="text-muted empty">No activity yet.</p>
        <ul v-else class="activity-list">
          <li v-for="entry in activity" :key="entry.id" class="activity-entry">
            <span class="dot" />
            <div class="activity-copy">
              <span class="activity-action">{{ formatClientActivityEntry(entry) }}</span>
              <span class="activity-meta text-muted">{{ entry.userName }} · {{ formatActivityDate(entry.createdAt) }}</span>
            </div>
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.document-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.back {
  font-size: 0.8125rem;
  text-decoration: none;
}

.back:hover {
  color: var(--text);
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.meta {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.type-badge {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: rgba(107, 140, 255, 0.14);
  color: var(--primary);
  font-size: 0.6875rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 1rem;
  align-items: start;
}

.detail-main {
  padding: 1rem;
}

.detail-sidebar {
  padding: 1rem;
}

.sidebar-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.retention-note {
  margin: 0.35rem 0 0.75rem;
  font-size: 0.75rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.edit-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.empty-body {
  margin: 0;
  font-size: 0.875rem;
}

.legacy-note {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-entry {
  display: flex;
  gap: 0.65rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border);
}

.activity-entry:last-child {
  border-bottom: none;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  margin-top: 0.4rem;
  flex-shrink: 0;
}

.activity-copy {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.activity-action {
  font-size: 0.8125rem;
  line-height: 1.35;
}

.activity-meta {
  font-size: 0.6875rem;
}

.error {
  color: var(--danger);
}

.empty {
  font-size: 0.8125rem;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
