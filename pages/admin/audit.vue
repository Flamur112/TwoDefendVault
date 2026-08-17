<script setup lang="ts">
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, type AuditLogRecord } from '~/types/audit'

definePageMeta({ middleware: ['auth', 'admin'] })

const apiFetch = useApiFetch()

const logs = ref<AuditLogRecord[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

const filters = reactive({
  action: '',
  success: '',
  from: '',
  to: '',
})

const limit = 100
const offset = ref(0)

function actionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString()
}

function metadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query: Record<string, string | number> = {
      limit,
      offset: offset.value,
    }
    if (filters.action) query.action = filters.action
    if (filters.success) query.success = filters.success
    if (filters.from) query.from = new Date(filters.from).toISOString()
    if (filters.to) {
      const end = new Date(filters.to)
      end.setHours(23, 59, 59, 999)
      query.to = end.toISOString()
    }

    const data = await apiFetch<{ logs: AuditLogRecord[], total: number }>('/api/admin/audit', { query })
    logs.value = data.logs
    total.value = data.total
  }
  catch {
    error.value = 'Failed to load audit log'
  }
  finally {
    loading.value = false
  }
}

function applyFilters() {
  offset.value = 0
  load()
}

function nextPage() {
  if (offset.value + limit >= total.value) return
  offset.value += limit
  load()
}

function prevPage() {
  offset.value = Math.max(0, offset.value - limit)
  load()
}

await load()
</script>

<template>
  <div class="audit-page">
    <div class="toolbar">
      <div>
        <h1 class="page-title">Audit Log</h1>
        <p class="text-muted description">Security events across your organization. No secrets are stored here.</p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="load">
        Refresh
      </button>
    </div>

    <div class="filters card">
      <label>
        Action
        <select v-model="filters.action">
          <option value="">All actions</option>
          <option v-for="action in AUDIT_ACTIONS" :key="action" :value="action">
            {{ actionLabel(action) }}
          </option>
        </select>
      </label>
      <label>
        Result
        <select v-model="filters.success">
          <option value="">All results</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
      </label>
      <label>
        From
        <input v-model="filters.from" type="date">
      </label>
      <label>
        To
        <input v-model="filters.to" type="date">
      </label>
      <button type="button" class="btn btn-primary" @click="applyFilters">
        Apply
      </button>
    </div>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="logs.length === 0" class="card empty">
      <p class="text-muted">No audit events match your filters.</p>
    </div>
    <div v-else class="card table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>User</th>
            <th>Target</th>
            <th>Result</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="when">{{ formatWhen(log.createdAt) }}</td>
            <td>{{ actionLabel(log.action) }}</td>
            <td>
              <span v-if="log.userEmail">{{ log.userDisplayName || log.userEmail }}</span>
              <span v-else class="text-muted">System</span>
            </td>
            <td class="target">
              <span v-if="log.targetType">{{ log.targetType }}</span>
              <span v-if="log.targetId" class="text-muted target-id">{{ log.targetId.slice(0, 8) }}…</span>
              <span v-if="!log.targetType && !log.targetId" class="text-muted">—</span>
            </td>
            <td>
              <span :class="log.success ? 'badge success' : 'badge failed'">
                {{ log.success ? 'Success' : 'Failed' }}
              </span>
            </td>
            <td class="details text-muted">
              {{ metadataSummary(log.metadata) || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && total > limit" class="pager">
      <button type="button" class="btn" :disabled="offset === 0" @click="prevPage">
        Previous
      </button>
      <span class="text-muted">
        {{ offset + 1 }}-{{ Math.min(offset + limit, total) }} of {{ total }}
      </span>
      <button type="button" class="btn" :disabled="offset + limit >= total" @click="nextPage">
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-title {
  margin: 0;
}

.description {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1rem;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8125rem;
}

.table-wrap {
  overflow-x: auto;
  padding: 0;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.audit-table th,
.audit-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.audit-table th {
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6875rem;
}

.when {
  white-space: nowrap;
}

.target-id {
  display: block;
  font-size: 0.75rem;
}

.details {
  max-width: 18rem;
  word-break: break-word;
}

.badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.badge.success {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.badge.failed {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.empty {
  text-align: center;
  padding: 2rem;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.error {
  color: var(--danger);
}
</style>
