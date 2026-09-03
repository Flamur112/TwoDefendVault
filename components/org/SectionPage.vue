<script setup lang="ts">
import type { OrgSectionRecord } from '~/types/client'
import { CLIENT_SECTIONS, sectionFieldDisplayKey, type ClientSection } from '~/utils/client-sections'

const props = defineProps<{ section: ClientSection }>()

const apiFetch = useApiFetch()
const appSearch = useAppSearch()

const config = computed(() => CLIENT_SECTIONS[props.section])
const sectionPath = computed(() => props.section)

useAppSearchPlaceholder(`Search all ${config.value.label.toLowerCase()}...`)

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
      { query: { section: props.section } },
    )
    records.value = data.records
    truncated.value = data.truncated
  }
  catch (e: unknown) {
    const err = e as { statusMessage?: string }
    error.value = err.statusMessage?.includes('migrate')
      ? err.statusMessage
      : `Failed to load ${config.value.label.toLowerCase()}`
  }
  finally {
    loading.value = false
  }
}

await load()

const filteredRecords = computed(() => {
  if (!appSearch.normalizedQuery.value) return records.value
  return records.value.filter(record =>
    appSearch.matchesSearch(
      record.title,
      record.notes,
      record.clientName,
      ...Object.values(record.metadata),
    ),
  )
})

function fieldValue(record: OrgSectionRecord, key: string): string | undefined {
  const val = record.metadata[key]
  return val || undefined
}

function fieldDisplayValue(record: OrgSectionRecord, field: (typeof config.value.fields)[number]): string | undefined {
  if (field.type === 'user') {
    const displayKey = sectionFieldDisplayKey(field)
    if (displayKey) {
      const name = record.metadata[displayKey]
      if (name) return name
    }
    return undefined
  }
  return fieldValue(record, field.key)
}

function clientSectionLink(record: OrgSectionRecord): string {
  return `/clients/${record.clientId}/${sectionPath.value}`
}
</script>

<template>
  <div class="org-section-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <h1 class="page-title">{{ config.label }}</h1>
        <p class="text-muted description">{{ config.guide.summary }}</p>
        <p v-if="!loading" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${filteredRecords.length} of ${records.length}` : records.length }}
          {{ records.length === 1 ? 'entry' : 'entries' }} across all clients
        </p>
        <p v-if="truncated && !loading" class="text-muted truncate-note">
          Showing the first {{ records.length }} entries. Open a client to see more.
        </p>
      </div>
      <NuxtLink to="/clients" class="btn btn-primary">
        Manage on clients
      </NuxtLink>
    </div>

    <ClientsSectionGuide v-if="!loading && !error" :guide="config.guide" compact />

    <UiPageSearch
      v-if="!loading && !error"
      :placeholder="`Search all ${config.label.toLowerCase()}...`"
    />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="records.length === 0" class="card empty">
      <p class="text-muted">No {{ config.label.toLowerCase() }} yet.</p>
      <NuxtLink to="/clients" class="btn btn-primary">Go to clients</NuxtLink>
    </div>
    <div v-else-if="filteredRecords.length === 0" class="card empty">
      <p class="text-muted">No {{ config.label.toLowerCase() }} match your search.</p>
    </div>
    <div v-else class="record-list">
      <article v-for="record in filteredRecords" :key="record.id" class="card record-card">
        <div class="record-header">
          <div>
            <h3>{{ record.title }}</h3>
            <NuxtLink :to="clientSectionLink(record)" class="client-link">
              {{ record.clientName }}
            </NuxtLink>
          </div>
          <NuxtLink :to="clientSectionLink(record)" class="btn btn-sm">
            Open on client
          </NuxtLink>
        </div>
        <dl class="record-fields">
          <template v-for="field in config.fields" :key="field.key">
            <div v-if="fieldDisplayValue(record, field)">
              <dt>{{ field.label }}</dt>
              <dd>
                <a
                  v-if="field.type === 'url'"
                  :href="fieldDisplayValue(record, field)"
                  target="_blank"
                  rel="noopener"
                >{{ fieldDisplayValue(record, field) }}</a>
                <span v-else>{{ fieldDisplayValue(record, field) }}</span>
              </dd>
            </div>
          </template>
          <div v-if="record.notes">
            <dt>Notes</dt>
            <dd class="notes">{{ record.notes }}</dd>
          </div>
        </dl>
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

.record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.record-header h3 {
  margin: 0 0 0.2rem;
  font-size: 0.9375rem;
}

.client-link {
  font-size: 0.8125rem;
  text-decoration: none;
}

.client-link:hover {
  text-decoration: underline;
}

.record-fields {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
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
  word-break: break-word;
}

dd a {
  color: var(--primary);
}

.notes {
  white-space: pre-wrap;
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
