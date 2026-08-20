<script setup lang="ts">
import { formatAuditTimestamp } from '~/utils/audit-display'

definePageMeta({ middleware: 'auth' })

interface SignInEvent {
  id: string
  action: 'auth.login' | 'auth.login_failed'
  success: boolean
  email: string | null
  userId: string | null
  userDisplayName: string | null
  ipAddress: string | null
  userAgent: string | null
  reason: string | null
  provider: string | null
  createdAt: string
}

const apiFetch = useApiFetch()

const events = ref<SignInEvent[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const filterSuccess = ref('')

const limit = 50
const offset = ref(0)

const REASON_LABELS: Record<string, string> = {
  not_invited: 'Not authorized',
  domain_not_allowed: 'Email domain blocked',
  deactivated: 'Account deactivated',
  invalid_state: 'Invalid login state',
  missing_code_or_state: 'Missing OAuth response',
}

function formatReason(reason: string | null): string {
  if (!reason) return ''
  return REASON_LABELS[reason] ?? reason.replace(/_/g, ' ')
}

function formatEmail(event: SignInEvent): string {
  return event.email || event.userDisplayName || 'Unknown'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query: Record<string, string | number> = {
      limit,
      offset: offset.value,
    }
    if (filterSuccess.value) query.success = filterSuccess.value

    const data = await apiFetch<{
      events: SignInEvent[]
      total: number
    }>('/api/admin/sign-ins', { query })
    events.value = data.events
    total.value = data.total
  }
  catch {
    error.value = 'Failed to load sign-in activity'
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
  <div class="sign-ins-page">
    <div class="toolbar">
      <div>
        <h1 class="page-title">Sign-in Activity</h1>
        <p class="text-muted description">
          Successful sign-ins and blocked attempts, with IP addresses. Only recorded at login — not on every page view.
        </p>
      </div>
      <button type="button" class="btn" :disabled="loading" @click="load">
        Refresh
      </button>
    </div>

    <div class="filters card">
      <label>
        Result
        <select v-model="filterSuccess">
          <option value="">All attempts</option>
          <option value="true">Successful only</option>
          <option value="false">Blocked / failed only</option>
        </select>
      </label>
      <button type="button" class="btn btn-primary" @click="applyFilters">
        Apply
      </button>
    </div>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="events.length === 0" class="card empty">
      <p class="text-muted">No sign-in events recorded yet.</p>
    </div>
    <div v-else class="card table-wrap">
      <table class="activity-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Email</th>
            <th>Result</th>
            <th>IP address</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td class="when">{{ formatAuditTimestamp(event.createdAt).local }}</td>
            <td>{{ formatEmail(event) }}</td>
            <td>
              <span :class="event.success ? 'badge success' : 'badge failed'">
                {{ event.success ? 'Signed in' : 'Blocked' }}
              </span>
            </td>
            <td class="mono">{{ event.ipAddress || 'Unknown' }}</td>
            <td class="text-muted">
              {{ event.success ? '—' : (formatReason(event.reason) || 'Failed') }}
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
  max-width: 42rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
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

.activity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.activity-table th,
.activity-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.activity-table th {
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6875rem;
}

.when {
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
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
