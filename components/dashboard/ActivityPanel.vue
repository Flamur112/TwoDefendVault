<template>
  <section class="panel card">
    <div class="panel-header">
      <div>
        <span class="panel-kicker panel-kicker--activity">Activity</span>
        <h2 class="panel-title">Recent updates</h2>
      </div>
      <span class="retention">Last 14 days</span>
    </div>

    <p v-if="loading" class="text-muted empty">Loading…</p>
    <p v-else-if="entries.length === 0" class="text-muted empty">No recent activity yet.</p>
    <ul v-else class="list">
      <li v-for="entry in entries" :key="entry.id" class="entry">
        <span class="dot" :class="dotClass(entry.action)" />
        <div class="content">
          <p class="summary">
            <span class="action-label" :class="actionClass(entry.action)">
              {{ actionLabel(entry) }}
            </span>
            <span v-if="detailLabel(entry)" class="detail">{{ detailLabel(entry) }}</span>
          </p>
          <p class="meta text-muted">
            <NuxtLink :to="`/clients/${entry.clientId}`" class="client-link">{{ entry.clientName }}</NuxtLink>
            <span class="sep">·</span>
            <span>{{ entry.userName }}</span>
            <span class="sep">·</span>
            <span>{{ formatDate(entry.createdAt) }}</span>
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardActivityEntry } from '~/types/dashboard'
import {
  getClientActivityActionLabel,
  getClientActivityDetail,
} from '~/utils/client-activity'

defineProps<{
  entries: DashboardActivityEntry[]
  loading?: boolean
}>()

function actionLabel(entry: DashboardActivityEntry) {
  return getClientActivityActionLabel(entry.action)
}

function detailLabel(entry: DashboardActivityEntry) {
  return getClientActivityDetail(entry.action, entry.metadata as Record<string, unknown> | null)
}

function actionClass(action: string): string {
  if (action === 'credential_added') return 'action--teal'
  if (action.startsWith('documents_')) return 'action--violet'
  if (action === 'favorite_toggled') return 'action--gold'
  if (action === 'created') return 'action--violet'
  return 'action--sky'
}

function dotClass(action: string): string {
  if (action === 'credential_added') return 'dot--teal'
  if (action.startsWith('documents_')) return 'dot--violet'
  if (action.startsWith('vault_')) return 'dot--sky'
  if (action === 'created') return 'dot--violet'
  return 'dot--sky'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.panel {
  margin-bottom: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.panel-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.retention {
  font-size: 0.75rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.entry:last-child {
  border-bottom: none;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  margin-top: 0.45rem;
  flex-shrink: 0;
}

.dot--teal { background: var(--accent-teal); }
.dot--violet { background: var(--accent-violet); }
.dot--sky { background: var(--accent-sky); }

.content {
  min-width: 0;
  flex: 1;
}

.summary {
  margin: 0;
  line-height: 1.4;
  font-size: 0.875rem;
}

.action-label {
  font-weight: 600;
}

.action--violet { color: var(--accent-violet); }
.action--teal { color: var(--accent-teal); }
.action--sky { color: var(--accent-sky); }
.action--gold { color: var(--favorite); }

.detail {
  color: var(--text);
  font-weight: 500;
}

.detail::before {
  content: ': ';
  color: var(--text-muted);
  font-weight: 400;
}

.meta {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
}

.client-link {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

.client-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.sep {
  margin: 0 0.35rem;
}

.empty {
  font-size: 0.875rem;
  margin: 0;
}
</style>
