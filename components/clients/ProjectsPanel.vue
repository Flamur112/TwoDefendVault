<script setup lang="ts">
import type { ClientSectionRecord } from '~/types/client'
import {
  assigneeLabels,
  buildProjectViewModel,
  getProjectStatus,
  parseAssignees,
  parseProjectUpdates,
  PROJECT_ASSIGNEES_KEY,
  PROJECT_STATUSES,
  PROJECT_UPDATES_KEY,
  serializeAssignees,
  type ProjectAssignee,
} from '~/utils/projects'
import { CLIENT_SECTIONS } from '~/utils/client-sections'

const guide = CLIENT_SECTIONS.projects.guide

const { user } = useSession()
const ctx = inject<{ clientId: Ref<string>, client: Ref<{ name: string } | null> }>('clientContext')!
const clientId = ctx.clientId
const clientName = computed(() => ctx.client.value?.name ?? '')
const apiFetch = useApiFetch()
const appSearch = useAppSearch()
const { members: orgMembers, loadMembers } = useOrgMembers()

useAppSearchPlaceholder('Search projects...')

const records = ref<ClientSectionRecord[]>([])
const loading = ref(true)
const error = ref('')

const showForm = ref(false)
const editing = ref<ClientSectionRecord | null>(null)
const saving = ref(false)
const deleting = ref<ClientSectionRecord | null>(null)
const deletingInProgress = ref(false)

const expandedUpdates = ref<Set<string>>(new Set())
const openCards = ref<Set<string>>(new Set())
const postingUpdateId = ref<string | null>(null)
const updateForms = reactive<Record<string, { text: string, status: string }>>({})

const form = reactive({
  title: '',
  notes: '',
  status: 'Open' as string,
  startDate: '',
  endDate: '',
  assigneeIds: [] as string[],
})

const canWrite = computed(() => user.value?.role !== 'readonly')
const isAdmin = computed(() => user.value?.role === 'admin')
const canDelete = computed(() => isAdmin.value)
const canDownloadReport = computed(() => isAdmin.value)

const filteredRecords = computed(() => {
  if (!appSearch.normalizedQuery.value) return records.value
  return records.value.filter((record) => {
    const assignees = parseAssignees(record.metadata)
    const updates = parseProjectUpdates(record.metadata)
    return appSearch.matchesSearch(
      record.title,
      record.notes,
      getProjectStatus(record.metadata),
      assigneeLabels(assignees),
      ...updates.map(u => u.text),
      ...updates.map(u => u.userName),
      record.metadata.startDate,
      record.metadata.endDate,
    )
  })
})

const projectViews = computed(() => filteredRecords.value.map(buildProjectViewModel))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ records: ClientSectionRecord[] }>(
      `/api/clients/${clientId.value}/records`,
      { query: { section: 'projects' } },
    )
    records.value = data.records
    for (const record of records.value) {
      ensureUpdateForm(record.id, record)
    }
  }
  catch (e: unknown) {
    const err = e as { statusMessage?: string }
    error.value = err.statusMessage?.includes('migrate')
      ? err.statusMessage
      : 'Failed to load projects'
  }
  finally {
    loading.value = false
  }
}

await Promise.all([load(), loadMembers()])

function memberLabel(member: OrgMember): string {
  return member.displayName?.trim() || member.email
}

function resetForm() {
  form.title = ''
  form.notes = ''
  form.status = 'Open'
  form.startDate = ''
  form.endDate = ''
  form.assigneeIds = []
}

function openCreate() {
  editing.value = null
  resetForm()
  showForm.value = true
}

function openEditRecord(record: ClientSectionRecord) {
  openCards.value.add(record.id)
  openEdit(record)
}

function openEdit(record: ClientSectionRecord) {
  editing.value = record
  form.title = record.title
  form.notes = record.notes ?? ''
  form.status = getProjectStatus(record.metadata)
  form.startDate = record.metadata.startDate ?? ''
  form.endDate = record.metadata.endDate ?? ''
  form.assigneeIds = parseAssignees(record.metadata).map(a => a.id)
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
}

function buildAssignees(): ProjectAssignee[] {
  return form.assigneeIds
    .map((id) => {
      const member = orgMembers.value?.find(m => m.id === id)
      if (!member) return null
      return { id: member.id, name: memberLabel(member) }
    })
    .filter((entry): entry is ProjectAssignee => entry !== null)
}

function buildMetadata(existing?: ClientSectionRecord): Record<string, string> {
  const metadata: Record<string, string> = {
    status: form.status,
    [PROJECT_ASSIGNEES_KEY]: serializeAssignees(buildAssignees()),
  }

  if (form.startDate.trim()) metadata.startDate = form.startDate.trim()
  if (form.endDate.trim()) metadata.endDate = form.endDate.trim()

  if (existing?.metadata[PROJECT_UPDATES_KEY]) {
    metadata[PROJECT_UPDATES_KEY] = existing.metadata[PROJECT_UPDATES_KEY]
  }

  return metadata
}

async function save() {
  if (!form.title.trim()) return
  saving.value = true
  error.value = ''
  try {
    const body = {
      section: 'projects',
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      metadata: buildMetadata(editing.value ?? undefined),
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
    error.value = editing.value ? 'Failed to save changes' : 'Failed to add project'
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
    error.value = 'Failed to delete project'
  }
  finally {
    deletingInProgress.value = false
  }
}

function ensureUpdateForm(recordId: string, record: ClientSectionRecord) {
  if (!updateForms[recordId]) {
    updateForms[recordId] = {
      text: '',
      status: getProjectStatus(record.metadata),
    }
  }
}

function toggleUpdates(recordId: string) {
  if (expandedUpdates.value.has(recordId)) expandedUpdates.value.delete(recordId)
  else expandedUpdates.value.add(recordId)
}

function toggleCard(recordId: string) {
  if (openCards.value.has(recordId)) openCards.value.delete(recordId)
  else openCards.value.add(recordId)
}

function expandAllCards() {
  openCards.value = new Set(records.value.map(record => record.id))
}

function collapseAllCards() {
  openCards.value = new Set()
}

function replaceRecord(updated: ClientSectionRecord) {
  const idx = records.value.findIndex(r => r.id === updated.id)
  if (idx !== -1) records.value[idx] = updated
  ensureUpdateForm(updated.id, updated)
}

async function postUpdate(record: ClientSectionRecord) {
  ensureUpdateForm(record.id, record)
  const formState = updateForms[record.id]
  const text = formState.text.trim()
  const status = formState.status
  const currentStatus = getProjectStatus(record.metadata)

  if (!text && status === currentStatus) return

  postingUpdateId.value = record.id
  error.value = ''
  try {
    const data = await $fetch<{ record: ClientSectionRecord }>(
      `/api/clients/${clientId.value}/records/${record.id}/project-update`,
      {
        method: 'POST',
        body: {
          text: text || undefined,
          status: status !== currentStatus ? status : undefined,
        },
      },
    )

    replaceRecord(data.record)
    formState.text = ''
    formState.status = getProjectStatus(data.record.metadata)
    openCards.value.add(record.id)
    expandedUpdates.value.add(record.id)
  }
  catch {
    error.value = 'Failed to post update'
  }
  finally {
    postingUpdateId.value = null
  }
}

async function quickStatusChange(record: ClientSectionRecord, status: string) {
  if (status === getProjectStatus(record.metadata)) return

  postingUpdateId.value = record.id
  error.value = ''
  try {
    const data = await $fetch<{ record: ClientSectionRecord }>(
      `/api/clients/${clientId.value}/records/${record.id}/project-update`,
      { method: 'POST', body: { status } },
    )

    replaceRecord(data.record)
    if (updateForms[record.id]) {
      updateForms[record.id].status = status
    }
  }
  catch {
    error.value = 'Failed to update status'
  }
  finally {
    postingUpdateId.value = null
  }
}

function setUpdateText(record: ClientSectionRecord, text: string) {
  ensureUpdateForm(record.id, record)
  updateForms[record.id].text = text
}
</script>

<template>
  <div class="projects-panel">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="section-title">Projects</h2>
        <p v-if="!loading" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${projectViews.length} of ${records.length}` : records.length }}
          {{ records.length === 1 ? 'project' : 'projects' }}
        </p>
      </div>
      <div v-if="canWrite && !loading && records.length > 0" class="toolbar-actions">
        <button type="button" class="btn btn-sm" @click="expandAllCards">Expand all</button>
        <button type="button" class="btn btn-sm" @click="collapseAllCards">Collapse all</button>
        <button type="button" class="btn btn-primary" @click="openCreate">Add project</button>
      </div>
      <button v-else-if="canWrite" type="button" class="btn btn-primary" @click="openCreate">
        Add project
      </button>
    </div>

    <ClientsSectionGuide v-if="!loading && !error" :guide="guide" />

    <UiPageSearch v-if="!loading && !error" placeholder="Search projects..." />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="records.length === 0" class="card empty">
      <p class="text-muted">
        {{ canWrite ? 'No projects yet. Create one to track work and share updates with the team.' : 'No projects assigned to you.' }}
      </p>
      <button v-if="canWrite" type="button" class="btn btn-primary" @click="openCreate">
        Add project
      </button>
    </div>
    <div v-else-if="projectViews.length === 0" class="card empty">
      <p class="text-muted">No projects match your search.</p>
    </div>
    <div v-else class="project-list">
      <ProjectsProjectCard
        v-for="project in projectViews"
        :key="project.record.id"
        v-memo="[
          project.record.id,
          project.record.updatedAt,
          project.updates.length,
          project.updates[0]?.id,
          openCards.has(project.record.id),
          expandedUpdates.has(project.record.id),
          postingUpdateId === project.record.id,
          updateForms[project.record.id]?.text,
        ]"
        :project="project"
        :can-write="canWrite"
        :can-delete="canDelete"
        :can-download-report="canDownloadReport"
        :client-name="clientName"
        :current-user-id="user?.id"
        :client-id="clientId"
        :card-open="openCards.has(project.record.id)"
        :history-open="expandedUpdates.has(project.record.id)"
        :busy="postingUpdateId === project.record.id"
        :update-text="updateForms[project.record.id]?.text ?? ''"
        @edit="openEditRecord(project.record)"
        @delete="deleting = project.record"
        @toggle-card="toggleCard(project.record.id)"
        @toggle-history="toggleUpdates(project.record.id)"
        @update:text="setUpdateText(project.record, $event)"
        @post-update="postUpdate(project.record)"
        @quick-status="quickStatusChange(project.record, $event)"
        @record-updated="replaceRecord"
      />
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="closeForm">
      <div class="modal card">
        <h3>{{ editing ? 'Edit project' : 'Add project' }}</h3>
        <form class="form" @submit.prevent="save">
          <label>
            Title
            <input v-model="form.title" type="text" required placeholder="Project name">
          </label>
          <label>
            Status
            <select v-model="form.status">
              <option v-for="status in PROJECT_STATUSES" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </label>
          <label class="assignee-label">
            Assigned team members
            <UiUserMultiSelect
              v-model="form.assigneeIds"
              :users="orgMembers ?? []"
              placeholder="Search by name or email…"
            />
          </label>
          <div class="date-row">
            <label>
              Start date
              <input v-model="form.startDate" type="date">
            </label>
            <label>
              Target date
              <input v-model="form.endDate" type="date">
            </label>
          </div>
          <label>
            Description
            <textarea v-model="form.notes" rows="3" placeholder="Scope, goals, or background (optional)" />
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
        <h3>Delete project</h3>
        <p>Delete <strong>{{ deleting.title }}</strong>? All updates will be removed. This cannot be undone.</p>
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
  max-width: 40rem;
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

.project-list {
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
  max-width: 520px;
  max-height: 90vh;
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

.assignee-label {
  gap: 0.45rem;
}

.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
