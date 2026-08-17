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
        <span class="action" :class="actionClass(entry.action)">{{ formatAction(entry) }}</span>
        <NuxtLink :to="`/clients/${entry.clientId}`" class="item-name entry-name">{{ entry.clientName }}</NuxtLink>
        <span class="meta-line">{{ entry.userName }} · {{ formatDate(entry.createdAt) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardActivityEntry } from '~/types/dashboard'

defineProps<{
  entries: DashboardActivityEntry[]
  loading?: boolean
}>()

const ACTION_LABELS: Record<string, string> = {
  edited: 'Client edited',
  created: 'Client created',
  vault_added: 'Vault added',
  credential_added: 'Credential added',
  favorite_toggled: 'Favorite updated',
}

function formatAction(entry: DashboardActivityEntry) {
  return ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')
}

function actionClass(action: string): string {
  if (action === 'credential_added') return 'action--teal'
  if (action === 'favorite_toggled') return 'action--gold'
  if (action === 'created') return 'action--violet'
  return 'action--sky'
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
  display: grid;
  grid-template-columns: 9.5rem 1fr auto;
  gap: 0.5rem 1rem;
  align-items: center;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.entry:last-child {
  border-bottom: none;
}

.action {
  font-size: 0.75rem;
  font-weight: 600;
}

.action--violet { color: var(--accent-violet); }
.action--teal { color: var(--accent-teal); }
.action--sky { color: var(--accent-sky); }
.action--gold { color: var(--favorite); }

.entry-name {
  font-size: 0.875rem;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-name:hover {
  text-decoration: underline;
}

.empty {
  font-size: 0.875rem;
  margin: 0;
}

@media (max-width: 768px) {
  .entry {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }
}
</style>
