<script setup lang="ts">
import type { OrgSectionRecord } from '~/types/client'
import {
  assigneeLabels,
  buildProjectViewModel,
  formatProjectWhen,
  formatUpdateTimestamp,
  parseAssignees,
  parseProjectUpdates,
  projectStatusClass,
} from '~/utils/projects'

const apiFetch = useApiFetch()
const appSearch = useAppSearch()

useAppSearchPlaceholder('Search all projects...')

const records = ref<OrgSectionRecord[]>([])
const truncated = ref(false)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ records: OrgSectionRecord[], truncated: boolean }>(
      '/api/records',
      { query: { section: 'projects' } },
    )
    records.value = data.records
    truncated.value = data.truncated
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

await load()

const filteredRecords = computed(() => {
  if (!appSearch.normalizedQuery.value) return records.value
  return records.value.filter((record) => {
    const assignees = parseAssignees(record.metadata)
    const updates = parseProjectUpdates(record.metadata)
    const view = buildProjectViewModel(record)
    return appSearch.matchesSearch(
      record.title,
      record.notes,
      record.clientName,
      view.status,
      assigneeLabels(assignees),
      ...updates.map(u => u.text),
    )
  })
})

const projectViews = computed(() => filteredRecords.value.map(buildProjectViewModel))

function clientProjectsLink(record: OrgSectionRecord): string {
  return `/clients/${record.clientId}/projects`
}
</script>

<template>
  <div class="org-projects-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <h1 class="page-title">Projects</h1>
        <p class="text-muted description">
          All client projects across the org. Open a client to post updates or change assignments.
        </p>
        <p v-if="!loading" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${projectViews.length} of ${records.length}` : records.length }}
          {{ records.length === 1 ? 'project' : 'projects' }}
        </p>
        <p v-if="truncated && !loading" class="text-muted truncate-note">
          Showing the first {{ records.length }} projects. Open a client to see more.
        </p>
      </div>
      <NuxtLink to="/clients" class="btn btn-primary">
        Manage on clients
      </NuxtLink>
    </div>

    <UiPageSearch v-if="!loading && !error" placeholder="Search all projects..." />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="records.length === 0" class="card empty">
      <p class="text-muted">No projects yet.</p>
      <NuxtLink to="/clients" class="btn btn-primary">Go to clients</NuxtLink>
    </div>
    <div v-else-if="projectViews.length === 0" class="card empty">
      <p class="text-muted">No projects match your search.</p>
    </div>
    <div v-else class="project-list">
      <article v-for="project in projectViews" :key="project.record.id" class="card project-card">
        <div class="project-header">
          <div>
            <div class="project-title-row">
              <h3>{{ project.record.title }}</h3>
              <span class="status-badge" :class="projectStatusClass(project.status)">
                {{ project.status }}
              </span>
            </div>
            <NuxtLink :to="clientProjectsLink(project.record)" class="client-link">
              {{ project.record.clientName }}
            </NuxtLink>
            <p class="last-updated text-muted">
              Updated {{ formatProjectWhen(project.record.updatedAt) }}
            </p>
          </div>
          <NuxtLink :to="clientProjectsLink(project.record)" class="btn btn-sm">
            Open project
          </NuxtLink>
        </div>

        <div v-if="project.timeline" class="timeline-block">
          <div class="timeline-head">
            <span class="timeline-label">Timeline</span>
            <span class="timeline-caption" :class="`timeline-${project.timeline.tone}`">{{ project.timeline.label }}</span>
          </div>
          <div class="timeline-track">
            <div
              class="timeline-fill"
              :class="`timeline-${project.timeline.tone}`"
              :style="{ width: `${Math.min(project.timeline.percent, 100)}%` }"
            />
          </div>
        </div>

        <dl class="project-meta">
          <div>
            <dt>Assigned</dt>
            <dd>{{ assigneeLabels(project.assignees) }}</dd>
          </div>
        </dl>

        <div v-if="project.latestUpdate" class="latest-update">
          <p class="latest-label">Latest update</p>
          <p class="latest-text">{{ project.latestUpdate.text }}</p>
          <p class="latest-meta text-muted">{{ formatUpdateTimestamp(project.latestUpdate) }}</p>
        </div>
        <p v-else class="text-muted no-updates">No updates posted yet.</p>
      </article>
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

.page-title {
  margin: 0;
}

.description {
  margin: 0;
  font-size: 0.8125rem;
  max-width: 40rem;
}

.count-label,
.truncate-note {
  margin: 0;
  font-size: 0.8125rem;
}

.truncate-note {
  color: var(--primary);
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.65rem;
}

.project-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.project-title-row h3 {
  margin: 0;
  font-size: 0.9375rem;
}

.client-link {
  font-size: 0.8125rem;
  text-decoration: none;
}

.client-link:hover {
  text-decoration: underline;
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
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
}

.timeline-block {
  margin-bottom: 0.65rem;
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
}

.timeline-fill.timeline-ok { background: var(--success); }
.timeline-fill.timeline-warning { background: var(--warning); }
.timeline-fill.timeline-overdue { background: var(--danger); }
.timeline-fill.timeline-done { background: var(--success); }

.project-meta {
  margin: 0 0 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem 1rem;
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

.latest-update {
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(148, 163, 184, 0.08);
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

.no-updates {
  margin: 0;
  font-size: 0.8125rem;
}

.empty {
  text-align: center;
  padding: 2rem;
}

.error {
  color: var(--danger);
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  flex-shrink: 0;
}
</style>
