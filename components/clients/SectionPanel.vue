<script setup lang="ts">
import type { ClientSectionRecord } from '~/types/client'
import { CLIENT_SECTIONS, sectionFieldDisplayKey, type ClientSection } from '~/utils/client-sections'
import {
  DOCUMENT_ATTACHMENTS_KEY,
  parseDocumentAttachments,
  serializeDocumentAttachments,
  type DocumentAttachment,
} from '~/utils/document-attachments'
import {
  parseAllowedUsers,
  parseRecordVisibility,
  type RecordVisibility,
} from '~/utils/record-access'
import { getLicenseExpiryInfo } from '~/utils/license-expiry'

const props = defineProps<{ section: ClientSection }>()

const { user } = useSession()
const ctx = inject<{ clientId: Ref<string> }>('clientContext')!
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const appSearch = useAppSearch()
const { members: orgMembers, loadMembers } = useOrgMembers()

const config = computed(() => CLIENT_SECTIONS[props.section])
const supportsAttachments = computed(() => props.section === 'assets')
const needsMembers = computed(() => config.value.fields.some(field => field.type === 'user'))

useAppSearchPlaceholder(`Search ${config.value.label.toLowerCase()}...`)

const records = ref<ClientSectionRecord[]>([])
const loading = ref(true)
const error = ref('')

const showForm = ref(false)
const editing = ref<ClientSectionRecord | null>(null)
const saving = ref(false)
const deleting = ref<ClientSectionRecord | null>(null)
const deletingInProgress = ref(false)

const form = reactive({
  title: '',
  notes: '',
  metadata: {} as Record<string, string>,
  attachments: [] as DocumentAttachment[],
  visibility: 'all' as RecordVisibility,
  allowedUserIds: [] as string[],
})

const canWrite = computed(() => user.value?.role !== 'readonly')
const isAdmin = computed(() => user.value?.role === 'admin')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ records: ClientSectionRecord[] }>(
      `/api/clients/${clientId.value}/records`,
      { query: { section: props.section } },
    )
    records.value = data.records
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number, statusMessage?: string }
    error.value = err.statusMessage?.includes('migrate')
      ? err.statusMessage
      : `Failed to load ${config.value.label.toLowerCase()}`
  }
  finally {
    loading.value = false
  }
}

await Promise.all([
  load(),
  needsMembers.value ? loadMembers() : Promise.resolve(),
])

const filteredRecords = computed(() => {
  if (!appSearch.normalizedQuery.value) return records.value
  return records.value.filter(record =>
    appSearch.matchesSearch(
      record.title,
      record.notes,
      ...Object.values(record.metadata),
    ),
  )
})

function resetForm() {
  form.title = ''
  form.notes = ''
  form.metadata = {}
  form.attachments = []
  form.visibility = 'all'
  form.allowedUserIds = []
  for (const field of config.value.fields) {
    form.metadata[field.key] = ''
  }
}

function openCreate() {
  editing.value = null
  resetForm()
  showForm.value = true
}

function openEdit(record: ClientSectionRecord) {
  editing.value = record
  form.title = record.title
  form.notes = record.notes ?? ''
  form.metadata = { ...record.metadata }
  form.attachments = supportsAttachments.value
    ? parseDocumentAttachments(record.metadata)
    : []
  form.visibility = parseRecordVisibility(record.metadata)
  form.allowedUserIds = parseAllowedUsers(record.metadata).map(user => user.id)
  for (const field of config.value.fields) {
    if (!(field.key in form.metadata)) form.metadata[field.key] = ''
  }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function buildMetadata(): Record<string, string> {
  const metadata: Record<string, string> = {}

  for (const field of config.value.fields) {
    const value = form.metadata[field.key]?.trim()
    if (!value) continue

    metadata[field.key] = value

    if (field.type === 'user') {
      const displayKey = sectionFieldDisplayKey(field)
      const member = (orgMembers.value ?? []).find(m => m.id === value)
      if (displayKey && member) {
        metadata[displayKey] = member.displayName?.trim() || member.email
      }
    }
  }

  if (supportsAttachments.value) {
    if (form.attachments.length > 0) {
      metadata[DOCUMENT_ATTACHMENTS_KEY] = serializeDocumentAttachments(form.attachments)
    }
    else {
      delete metadata[DOCUMENT_ATTACHMENTS_KEY]
    }
  }

  return metadata
}

async function save() {
  if (!form.title.trim()) return
  saving.value = true
  error.value = ''
  try {
    const body = {
      section: props.section,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      metadata: buildMetadata(),
      ...(isAdmin.value
        ? { visibility: form.visibility, allowedUserIds: form.allowedUserIds }
        : {}),
    }

    if (editing.value) {
      await $fetch(`/api/clients/${clientId.value}/records/${editing.value.id}`, {
        method: 'PATCH',
        body,
      })
    }
    else {
      await $fetch(`/api/clients/${clientId.value}/records`, {
        method: 'POST',
        body,
      })
    }

    closeForm()
    await load()
  }
  catch {
    error.value = editing.value ? 'Failed to save changes' : `Failed to add ${config.value.label.toLowerCase().slice(0, -1)}`
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
    error.value = 'Failed to delete'
  }
  finally {
    deletingInProgress.value = false
  }
}

function fieldValue(record: ClientSectionRecord, key: string): string | undefined {
  const val = record.metadata[key]
  return val || undefined
}

function fieldDisplayValue(record: ClientSectionRecord, field: (typeof config.value.fields)[number]): string | undefined {
  if (field.type === 'user') {
    const displayKey = sectionFieldDisplayKey(field)
    if (displayKey) {
      const name = record.metadata[displayKey]
      if (name) return name
    }
    const userId = record.metadata[field.key]
    if (userId) {
      const member = (orgMembers.value ?? []).find(m => m.id === userId)
      if (member) return member.displayName?.trim() || member.email
    }
    return undefined
  }
  return fieldValue(record, field.key)
}

function memberLabel(member: OrgMember): string {
  return member.displayName?.trim() || member.email
}

function attachmentCount(record: ClientSectionRecord): number {
  return parseDocumentAttachments(record.metadata).length
}

function recordLink(record: ClientSectionRecord): string | undefined {
  return fieldValue(record, 'url')
}

function licenseExpiry(record: ClientSectionRecord) {
  if (props.section !== 'licenses') return null
  return getLicenseExpiryInfo(record.metadata.expiresAt)
}

function selectPlaceholder(field: (typeof config.value.fields)[number]): string {
  return `Select ${field.label.toLowerCase()}`
}
</script>

<template>
  <div class="section-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="section-title">{{ config.label }}</h2>
        <p class="text-muted description">{{ config.guide.summary }}</p>
        <p v-if="!loading" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${filteredRecords.length} of ${records.length}` : records.length }}
          {{ records.length === 1 ? 'entry' : 'entries' }}
        </p>
      </div>
      <button v-if="canWrite" type="button" class="btn btn-primary" @click="openCreate">
        {{ config.addLabel }}
      </button>
    </div>

    <ClientsSectionGuide v-if="!loading && !error" :guide="config.guide" />

    <UiPageSearch
      v-if="!loading && !error"
      :placeholder="`Search ${config.label.toLowerCase()}...`"
    />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="records.length === 0" class="card empty">
      <p class="text-muted">No {{ config.label.toLowerCase() }} yet.</p>
      <button v-if="canWrite" type="button" class="btn btn-primary" @click="openCreate">
        {{ config.addLabel }}
      </button>
    </div>
    <div v-else-if="filteredRecords.length === 0" class="card empty">
      <p class="text-muted">No {{ config.label.toLowerCase() }} match your search.</p>
    </div>
    <div v-else class="record-list">
      <article v-for="record in filteredRecords" :key="record.id" class="card record-card">
        <div class="record-header">
          <h3>
            {{ record.title }}
            <ClientsVisibilityBadge :metadata="record.metadata" />
            <span
              v-if="licenseExpiry(record)?.status === 'expired'"
              class="expiry-badge expired"
            >
              Expired
            </span>
            <span
              v-else-if="licenseExpiry(record)?.status === 'soon'"
              class="expiry-badge soon"
            >
              {{ licenseExpiry(record)?.label }}
            </span>
          </h3>
          <div class="record-actions">
            <a
              v-if="section === 'documents' && recordLink(record)"
              :href="recordLink(record)"
              target="_blank"
              rel="noopener"
              class="btn btn-sm btn-primary"
            >
              Open document
            </a>
            <template v-if="canWrite">
              <button type="button" class="btn btn-sm" @click="openEdit(record)">Edit</button>
              <button type="button" class="btn btn-sm btn-danger" @click="deleting = record">Delete</button>
            </template>
          </div>
        </div>
        <dl class="record-fields">
          <template v-for="field in config.fields" :key="field.key">
            <div v-if="fieldDisplayValue(record, field)">
              <dt>{{ field.label }}</dt>
              <dd>
                <a
                  v-if="field.type === 'url'"
                  :href="fieldDisplayValue(record, field)"
                  target="_blank"
                  rel="noopener"
                >Open link</a>
                <span v-else>{{ fieldDisplayValue(record, field) }}</span>
              </dd>
            </div>
          </template>
          <div v-if="supportsAttachments && attachmentCount(record) > 0">
            <dt>Files</dt>
            <dd>{{ attachmentCount(record) }} attached</dd>
          </div>
          <div v-if="section === 'licenses' && licenseExpiry(record)?.status !== 'none'">
            <dt>Expiry</dt>
            <dd :class="licenseExpiry(record)?.status === 'expired' ? 'expired-text' : licenseExpiry(record)?.status === 'soon' ? 'soon-text' : ''">
              {{ licenseExpiry(record)?.label }}
            </dd>
          </div>
          <div v-if="record.notes">
            <dt>Notes</dt>
            <dd class="notes">{{ record.notes }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal card">
        <h3>{{ editing ? 'Edit' : config.addLabel }}</h3>
        <form class="form" @submit.prevent="save">
          <label>
            {{ config.titleLabel || 'Title' }}
            <input
              v-model="form.title"
              type="text"
              required
              :placeholder="config.titlePlaceholder || 'Name'"
            >
          </label>
          <label v-for="field in config.fields" :key="field.key">
            {{ field.label }}
            <select
              v-if="field.type === 'select'"
              v-model="form.metadata[field.key]"
            >
              <option value="">{{ selectPlaceholder(field) }}</option>
              <option v-for="option in field.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
            <select
              v-else-if="field.type === 'user'"
              v-model="form.metadata[field.key]"
            >
              <option value="">Unassigned</option>
              <option v-for="member in (orgMembers ?? [])" :key="member.id" :value="member.id">
                {{ memberLabel(member) }}
              </option>
            </select>
            <input
              v-else
              v-model="form.metadata[field.key]"
              :type="field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'"
              :placeholder="field.placeholder"
            >
          </label>
          <DocumentsDocumentAttachments
            v-if="supportsAttachments"
            v-model="form.attachments"
            :client-id="clientId"
            :document-title="form.title || 'asset'"
            hint="Attach photos, warranty PDFs, or config exports. Saved when you click Save."
          />
          <ClientsRecordAccessField
            v-if="isAdmin"
            :visibility="form.visibility"
            :allowed-user-ids="form.allowedUserIds"
            @update:visibility="form.visibility = $event"
            @update:allowed-user-ids="form.allowedUserIds = $event"
          />
          <label>
            Notes
            <textarea
              v-model="form.notes"
              rows="3"
              :placeholder="config.notesPlaceholder || 'Optional notes'"
            />
          </label>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeForm">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="deleting" class="modal-backdrop" @click.self="deleting = null">
      <div class="modal card">
        <h3>Delete {{ config.label.slice(0, -1) }}</h3>
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

.description {
  margin: 0;
  font-size: 0.8125rem;
  max-width: 36rem;
}

.count-label {
  margin: 0;
  font-size: 0.8125rem;
}

.section-help {
  margin-bottom: 0.75rem;
  padding: 0.75rem 0.85rem;
}

.section-help p {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.record-header h3 {
  margin: 0;
  font-size: 0.9375rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.visibility-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}

.expiry-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.expiry-badge.expired {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.expiry-badge.soon {
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}

.expired-text {
  color: #dc2626;
}

.soon-text {
  color: #ca8a04;
}

.record-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.record-fields {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 0.5rem 1rem;
}

.record-fields div {
  min-width: 0;
}

dt {
  font-size: 0.6875rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

dd {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
  word-break: break-word;
}

dd a {
  color: var(--primary);
}

.notes {
  white-space: pre-wrap;
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
  max-width: 480px;
}

.modal:has(.attachments) {
  max-width: 760px;
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

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
</style>
