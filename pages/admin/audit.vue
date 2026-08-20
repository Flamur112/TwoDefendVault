<script setup lang="ts">
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  type AuditLogRecord,
} from '~/types/audit'
import {
  AUDIT_RETENTION_DAYS,
  AUDIT_TARGET_TYPE_LABELS,
  formatAuditMetadata,
  formatAuditTimestamp,
} from '~/utils/audit-display'

definePageMeta({ middleware: 'auth' })

const apiFetch = useApiFetch()

const logs = ref<AuditLogRecord[]>([])
const total = ref(0)
const retentionDays = ref(AUDIT_RETENTION_DAYS)
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

const timezoneLabel = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

function actionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/\./g, ' ')
}

function targetTypeLabel(type: string | null): string {
  if (!type) return ''
  return AUDIT_TARGET_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

function formatTarget(log: AuditLogRecord): { primary: string, secondary: string } {
  if (log.targetLabel) {
    return {
      primary: log.targetLabel,
      secondary: log.targetType ? targetTypeLabel(log.targetType) : '',
    }
  }

  if (log.targetType === 'user' && typeof log.metadata?.email === 'string') {
    return {
      primary: log.metadata.email,
      secondary: 'User account',
    }
  }

  if (typeof log.metadata?.name === 'string') {
    return {
      primary: log.metadata.name,
      secondary: log.targetType ? targetTypeLabel(log.targetType) : '',
    }
  }

  if (log.targetType) {
    return {
      primary: targetTypeLabel(log.targetType),
      secondary: log.targetId ? `ID ${log.targetId.slice(0, 8)}` : '',
    }
  }

  return { primary: '', secondary: '' }
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

    const data = await apiFetch<{
      logs: AuditLogRecord[]
      total: number
      retentionDays: number
    }>('/api/admin/audit', { query })
    logs.value = data.logs
    total.value = data.total
    retentionDays.value = data.retentionDays
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
        <p class="text-muted description">
          Security and access events for your organization. Passwords and secrets are never stored here.
        </p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="load">
        Refresh
      </button>
    </div>

    <div class="info-card card">
      <h2 class="info-title">About this log</h2>
      <ul class="info-list">
        <li>
          <strong>Retention:</strong> entries are kept for {{ retentionDays }} days, then eligible for removal.
        </li>
        <li>
          <strong>Time:</strong> timestamps use your browser's local timezone ({{ timezoneLabel }}).
        </li>
        <li>
          <strong>Actor:</strong> the user column is who performed the action. "System" means no signed-in user (for example a failed login attempt).
        </li>
        <li>
          <strong>Target:</strong> what was affected (a user account, vault, credential, and so on).
        </li>
        <li>
          <strong>Details:</strong> extra context such as sign-in provider, changed fields, or failure reason. No secrets are included.
        </li>
      </ul>
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
            <th>When (local)</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Target</th>
            <th>Result</th>
            <th>IP address</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="when">
              <span>{{ formatAuditTimestamp(log.createdAt).local }}</span>
            </td>
            <td>{{ actionLabel(log.action) }}</td>
            <td>
              <span v-if="log.userEmail">{{ log.userDisplayName || log.userEmail }}</span>
              <span v-else class="text-muted">System</span>
            </td>
            <td class="target">
              <template v-if="formatTarget(log).primary">
                <span>{{ formatTarget(log).primary }}</span>
                <span v-if="formatTarget(log).secondary" class="text-muted target-sub">
                  {{ formatTarget(log).secondary }}
                </span>
              </template>
              <span v-else class="text-muted">None</span>
            </td>
            <td>
              <span :class="log.success ? 'badge success' : 'badge failed'">
                {{ log.success ? 'Success' : 'Failed' }}
              </span>
            </td>
            <td class="mono">{{ log.ipAddress || 'None' }}</td>
            <td class="details text-muted">
              {{ formatAuditMetadata(log.metadata) || 'None' }}
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
  max-width: 40rem;
}

.info-card {
  margin-bottom: 1rem;
}

.info-title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
}

.info-list {
  margin: 0;
  padding-left: 1.15rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-list strong {
  color: var(--text);
  font-weight: 600;
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

.target-sub {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.15rem;
}

.details {
  max-width: 20rem;
  word-break: break-word;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  white-space: nowrap;
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
