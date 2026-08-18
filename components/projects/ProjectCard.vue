<script setup lang="ts">
import {
  formatProjectTimestamp,
  formatProjectWhen,
  formatUpdateTimestamp,
  PROJECT_STATUSES,
  projectStatusClass,
  type ProjectUpdate,
  type ProjectViewModel,
} from '~/utils/projects'
import { downloadProjectReport } from '~/utils/project-report'

const props = defineProps<{
  project: ProjectViewModel
  canWrite: boolean
  canDelete: boolean
  canDownloadReport: boolean
  clientName?: string
  currentUserId?: string
  clientId: string
  cardOpen: boolean
  historyOpen: boolean
  busy: boolean
  updateText: string
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  'toggle-card': []
  'toggle-history': []
  'update:text': [value: string]
  'post-update': []
  'quick-status': [status: string]
  'record-updated': [record: ProjectViewModel['record']]
}>()

const summaryLatest = computed(() => {
  const text = props.project.latestUpdate?.text
  if (!text) return ''
  return text.length > 90 ? `${text.slice(0, 90)}…` : text
})

const recentUpdates = computed(() => props.project.updates.slice(0, 3))

const olderUpdateCount = computed(() => Math.max(0, props.project.updates.length - recentUpdates.value.length))

const assigneeSummary = computed(() => {
  const count = props.project.assignees.length
  if (count === 0) return 'Unassigned'
  if (count === 1) return props.project.assignees[0].name
  return `${count} people assigned`
})

const editingUpdateId = ref<string | null>(null)
const editingUpdateText = ref('')
const savingEdit = ref(false)

function canEditUpdate(entry: ProjectUpdate): boolean {
  return !!props.currentUserId && entry.userId === props.currentUserId
}

function startEditUpdate(entry: ProjectUpdate) {
  editingUpdateId.value = entry.id
  editingUpdateText.value = entry.text
}

function cancelEditUpdate() {
  editingUpdateId.value = null
  editingUpdateText.value = ''
}

async function saveEditUpdate(entry: ProjectUpdate) {
  const text = editingUpdateText.value.trim()
  if (!text || text === entry.text) {
    cancelEditUpdate()
    return
  }

  savingEdit.value = true
  try {
    const data = await $fetch<{ record: ProjectViewModel['record'] }>(
      `/api/clients/${props.clientId}/records/${props.project.record.id}/updates/${entry.id}`,
      { method: 'PATCH', body: { text } },
    )
    emit('record-updated', data.record)
    cancelEditUpdate()
  }
  catch {
    // Parent shows global error if needed; keep edit open
  }
  finally {
    savingEdit.value = false
  }
}

function downloadReport() {
  downloadProjectReport(props.project, props.clientName)
}
</script>

<template>
  <article class="card project-card" :class="{ 'is-collapsed': !cardOpen }">
    <div class="card-summary">
      <button type="button" class="summary-toggle" @click="emit('toggle-card')">
        <span class="chevron" :class="{ open: cardOpen }" aria-hidden="true">›</span>
        <span class="summary-copy">
          <span class="summary-title-row">
            <strong class="summary-title">{{ project.record.title }}</strong>
            <span class="status-badge" :class="projectStatusClass(project.status)">
              {{ project.status }}
            </span>
          </span>
          <span class="summary-meta text-muted">
            <span v-if="project.timeline">{{ project.timeline.label }}</span>
            <span v-if="project.timeline"> · </span>
            <span>{{ assigneeSummary }}</span>
            <span v-if="summaryLatest"> · {{ summaryLatest }}</span>
          </span>
        </span>
        <span class="summary-action-label">{{ cardOpen ? 'Collapse' : 'Expand' }}</span>
      </button>
      <div v-if="canWrite || canDelete || canDownloadReport" class="summary-actions">
        <button
          v-if="canDownloadReport"
          type="button"
          class="btn btn-sm"
          title="Download project report"
          @click.stop="downloadReport"
        >
          Download
        </button>
        <button v-if="canWrite" type="button" class="btn btn-sm" @click.stop="emit('edit')">Edit</button>
        <button
          v-if="canDelete"
          type="button"
          class="btn btn-sm btn-danger"
          @click.stop="emit('delete')"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-show="cardOpen" class="card-body">
    <p class="last-updated text-muted">
      Project updated {{ formatProjectWhen(project.record.updatedAt) }}
      <span class="last-updated-exact">({{ formatProjectTimestamp(project.record.updatedAt) }})</span>
    </p>

    <div v-if="project.timeline" class="timeline-block">
      <div class="timeline-head">
        <span class="timeline-label">Timeline</span>
        <span class="timeline-caption" :class="`timeline-${project.timeline.tone}`">{{ project.timeline.label }}</span>
      </div>
      <div class="timeline-track" role="progressbar" :aria-valuenow="project.timeline.percent" aria-valuemin="0" aria-valuemax="100">
        <div
          class="timeline-fill"
          :class="`timeline-${project.timeline.tone}`"
          :style="{ width: `${Math.min(project.timeline.percent, 100)}%` }"
        />
      </div>
      <p v-if="project.record.metadata.startDate || project.record.metadata.endDate" class="timeline-dates text-muted">
        <span v-if="project.record.metadata.startDate">Start {{ project.record.metadata.startDate }}</span>
        <span v-if="project.record.metadata.startDate && project.record.metadata.endDate"> · </span>
        <span v-if="project.record.metadata.endDate">Target {{ project.record.metadata.endDate }}</span>
      </p>
    </div>

    <dl class="project-meta">
      <div>
        <dt>Assigned</dt>
        <dd>
          <span v-if="project.assignees.length === 0" class="text-muted">Unassigned</span>
          <span v-else class="assignee-list">
            <span v-for="assignee in project.assignees" :key="assignee.id" class="assignee-chip">
              {{ assignee.name }}
            </span>
          </span>
        </dd>
      </div>
    </dl>

    <p v-if="project.record.notes" class="project-notes text-muted">{{ project.record.notes }}</p>

    <div v-if="project.updates.length > 0" class="updates-feed">
      <div class="updates-feed-head">
        <p class="updates-feed-title">Recent updates</p>
        <span class="updates-count text-muted">{{ project.updates.length }} total</span>
      </div>
      <ul class="recent-updates">
        <li v-for="entry in recentUpdates" :key="entry.id" class="recent-update">
          <div v-if="editingUpdateId === entry.id" class="edit-update">
            <textarea v-model="editingUpdateText" rows="2" />
            <div class="edit-update-actions">
              <button type="button" class="btn btn-sm" :disabled="savingEdit" @click="cancelEditUpdate">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="savingEdit"
                @click="saveEditUpdate(entry)"
              >
                {{ savingEdit ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
          <template v-else>
            <div class="history-row">
              <p class="recent-text">{{ entry.text }}</p>
              <button
                v-if="canEditUpdate(entry)"
                type="button"
                class="btn btn-sm history-edit"
                @click="startEditUpdate(entry)"
              >
                Edit
              </button>
            </div>
            <p class="recent-meta text-muted">
              {{ entry.userName }} · {{ formatUpdateTimestamp(entry) }}
              <span v-if="entry.status" class="status-pill">{{ entry.status }}</span>
            </p>
          </template>
        </li>
      </ul>
      <button
        v-if="olderUpdateCount > 0"
        type="button"
        class="btn btn-sm history-toggle"
        @click="emit('toggle-history')"
      >
        {{
          historyOpen
            ? 'Hide older updates'
            : `Show ${olderUpdateCount} older update${olderUpdateCount === 1 ? '' : 's'}`
        }}
      </button>
    </div>

    <div v-if="canWrite" class="update-section">
      <div class="quick-status">
        <label>
          Status
          <select
            :value="project.status"
            :disabled="busy"
            @change="emit('quick-status', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="option in PROJECT_STATUSES" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
      </div>

      <form class="update-form" @submit.prevent="emit('post-update')">
        <label>
          Post an update
          <textarea
            :value="updateText"
            rows="2"
            placeholder="What happened? What is next? Blockers?"
            @input="emit('update:text', ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <div class="update-actions">
          <button type="submit" class="btn btn-primary btn-sm" :disabled="busy">
            {{ busy ? 'Saving…' : 'Post update' }}
          </button>
        </div>
      </form>
    </div>

    <ul v-if="historyOpen && project.updates.length > recentUpdates.length" class="update-history">
      <li v-for="entry in project.updates.slice(recentUpdates.length)" :key="entry.id">
        <div v-if="editingUpdateId === entry.id" class="edit-update">
          <textarea v-model="editingUpdateText" rows="2" />
          <div class="edit-update-actions">
            <button type="button" class="btn btn-sm" :disabled="savingEdit" @click="cancelEditUpdate">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="savingEdit"
              @click="saveEditUpdate(entry)"
            >
              {{ savingEdit ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
        <template v-else>
          <div class="history-row">
            <p class="history-text">{{ entry.text }}</p>
            <button
              v-if="canEditUpdate(entry)"
              type="button"
              class="btn btn-sm history-edit"
              @click="startEditUpdate(entry)"
            >
              Edit
            </button>
          </div>
          <p class="history-meta text-muted">
            {{ entry.userName }} · {{ formatUpdateTimestamp(entry) }}
            <span v-if="entry.status"> · Status: {{ entry.status }}</span>
          </p>
        </template>
      </li>
    </ul>
    </div>
  </article>
</template>

<style scoped>
.project-card.is-collapsed {
  padding-bottom: 0.65rem;
}

.card-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.summary-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.summary-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.summary-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.summary-meta {
  font-size: 0.75rem;
  line-height: 1.35;
}

.summary-action-label {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: var(--text-muted);
  padding-top: 0.15rem;
}

.chevron {
  display: inline-block;
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--text-muted);
  transform: rotate(0deg);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.summary-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.card-body {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.status-open { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.status-progress { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.status-hold { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.status-blocked { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.status-done { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.status-default { background: rgba(148, 163, 184, 0.15); color: var(--text-muted); }

.last-updated {
  margin: 0 0 0.65rem;
  font-size: 0.75rem;
}

.last-updated-exact {
  opacity: 0.85;
}

.timeline-block {
  margin-bottom: 0.75rem;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.timeline-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.timeline-caption {
  font-size: 0.75rem;
  font-weight: 600;
}

.timeline-ok { color: var(--success); }
.timeline-warning { color: var(--warning); }
.timeline-overdue { color: var(--danger); }
.timeline-done { color: var(--success); }

.timeline-track {
  height: 0.4rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.15);
  overflow: hidden;
}

.timeline-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.timeline-fill.timeline-ok { background: var(--success); }
.timeline-fill.timeline-warning { background: var(--warning); }
.timeline-fill.timeline-overdue { background: var(--danger); }
.timeline-fill.timeline-done { background: var(--success); }

.timeline-dates {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
}

.project-meta {
  margin: 0 0 0.5rem;
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
}

.assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.assignee-chip {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 0.8125rem;
}

.project-notes {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  white-space: pre-wrap;
}

.latest-update {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(148, 163, 184, 0.08);
}

.updates-feed {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(148, 163, 184, 0.08);
}

.updates-feed-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.updates-feed-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.updates-count {
  font-size: 0.6875rem;
}

.recent-updates {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.recent-update {
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--border);
}

.recent-update:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.recent-text {
  margin: 0;
  font-size: 0.875rem;
  white-space: pre-wrap;
}

.recent-meta {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
}

.status-pill {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  font-size: 0.6875rem;
}

.history-toggle {
  margin-top: 0.55rem;
}

.latest-label {
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.latest-text {
  margin: 0;
  font-size: 0.875rem;
}

.latest-meta {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
}

.update-section {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.quick-status label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  max-width: 12rem;
}

.update-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.update-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.update-history {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0.75rem 0 0;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.history-text {
  margin: 0;
  font-size: 0.875rem;
  white-space: pre-wrap;
}

.history-edit {
  flex-shrink: 0;
}

.history-meta {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
}

.edit-update {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
</style>
