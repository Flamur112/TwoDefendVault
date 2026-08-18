<template>
  <div class="activity-feed">
    <div v-if="title || showFilters" class="feed-header">
      <div>
        <h3 v-if="title" class="feed-title">{{ title }}</h3>
        <p v-if="retentionDays" class="retention-note text-muted">Showing last {{ retentionDays }} days</p>
      </div>
      <div v-if="showFilters" class="filter-tabs">
        <button
          v-for="option in filterOptions"
          :key="option.value"
          type="button"
          class="filter-tab"
          :class="{ active: activeFilter === option.value }"
          @click="activeFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-muted">Loading activity…</p>
    <p v-else-if="filteredEntries.length === 0" class="text-muted empty">No activity yet.</p>
    <template v-else>
      <ul class="list">
        <li v-for="entry in visibleEntries" :key="entry.id" class="entry">
          <span class="dot" :class="dotClass(entry.action)" />
          <div class="content">
            <span class="action">{{ formatClientActivityEntry(entry) }}</span>
            <span class="meta text-muted">{{ entry.userName }} · {{ formatDate(entry.createdAt) }}</span>
          </div>
        </li>
      </ul>
      <button
        v-if="filteredEntries.length > initialLimit"
        type="button"
        class="show-more"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show less' : `Show all ${filteredEntries.length} entries` }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ClientActivityEntry } from '~/types/client'
import {
  ACTIVITY_RETENTION_DAYS,
  type ActivityFilter,
  filterActivityEntries,
  formatClientActivityEntry,
} from '~/utils/client-activity'

const props = withDefaults(defineProps<{
  entries: ClientActivityEntry[]
  loading?: boolean
  title?: string
  retentionDays?: number
  initialLimit?: number
  showFilters?: boolean
  defaultFilter?: ActivityFilter
}>(), {
  retentionDays: ACTIVITY_RETENTION_DAYS,
  initialLimit: 10,
  showFilters: false,
  defaultFilter: 'all',
})

const activeFilter = ref<ActivityFilter>(props.defaultFilter)
const expanded = ref(false)

const filterOptions: { value: ActivityFilter, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'documents', label: 'Documents' },
]

const filteredEntries = computed(() =>
  filterActivityEntries(props.entries, activeFilter.value),
)

const visibleEntries = computed(() => {
  if (expanded.value) return filteredEntries.value
  return filteredEntries.value.slice(0, props.initialLimit)
})

watch(activeFilter, () => {
  expanded.value = false
})

function dotClass(action: string): string {
  if (action === 'credential_added') return 'dot--teal'
  if (action.startsWith('documents_')) return 'dot--violet'
  if (action.startsWith('vault_')) return 'dot--sky'
  return ''
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
.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.feed-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.retention-note {
  font-size: 0.75rem;
  margin: 0.25rem 0 0;
}

.filter-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filter-tab {
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.6875rem;
  cursor: pointer;
}

.filter-tab.active {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--text);
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

.dot--teal { background: var(--accent-teal, #2dd4bf); }
.dot--violet { background: var(--accent-violet, #a78bfa); }
.dot--sky { background: var(--accent-sky, #38bdf8); }

.content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.action {
  font-size: 0.875rem;
  line-height: 1.35;
}

.meta {
  font-size: 0.75rem;
}

.empty {
  font-size: 0.875rem;
}

.show-more {
  margin-top: 0.5rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 0.8125rem;
  cursor: pointer;
}

.show-more:hover {
  text-decoration: underline;
}
</style>
