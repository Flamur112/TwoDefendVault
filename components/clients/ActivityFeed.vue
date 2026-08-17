<template>
  <div class="activity-feed">
    <h3 v-if="title" class="feed-title">{{ title }}</h3>
    <p v-if="retentionDays" class="retention-note text-muted">Showing last {{ retentionDays }} days</p>
    <p v-if="loading" class="text-muted">Loading activity…</p>
    <p v-else-if="entries.length === 0" class="text-muted empty">No activity yet.</p>
    <ul v-else class="list">
      <li v-for="entry in entries" :key="entry.id" class="entry">
        <span class="dot" />
        <div class="content">
          <span class="action">{{ formatAction(entry) }}</span>
          <span class="meta text-muted">{{ entry.userName }} · {{ formatDate(entry.createdAt) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { ClientActivityEntry } from '~/types/client'

defineProps<{
  entries: ClientActivityEntry[]
  loading?: boolean
  title?: string
  retentionDays?: number
}>()

const ACTION_LABELS: Record<string, string> = {
  edited: 'Edited client',
  created: 'Created client',
  vault_added: 'Added vault',
  credential_added: 'Added credential',
  favorite_toggled: 'Updated favorite',
}

function formatAction(entry: ClientActivityEntry) {
  const meta = entry.metadata as Record<string, string> | null
  if (ACTION_LABELS[entry.action]) return ACTION_LABELS[entry.action]
  if (meta?.vaultName) return `${entry.action}: ${meta.vaultName}`
  if (meta?.name) return `${entry.action}: ${meta.name}`
  if (meta?.itemName) return `${entry.action}: ${meta.itemName}`
  return entry.action
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
.feed-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.retention-note {
  font-size: 0.75rem;
  margin: -0.5rem 0 0.75rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
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

.content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.action {
  font-size: 0.875rem;
}

.meta {
  font-size: 0.75rem;
}

.empty {
  font-size: 0.875rem;
}
</style>
