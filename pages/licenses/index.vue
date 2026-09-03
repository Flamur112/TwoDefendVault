<script setup lang="ts">
import type { OrgLicensesResponse } from '~/types/licenses'

definePageMeta({ middleware: 'auth' })

const apiFetch = useApiFetch()
const appSearch = useAppSearch()

useAppSearchPlaceholder('Search licenses...')

const { data, pending, error } = useCachedAsyncData(
  'org-licenses',
  () => apiFetch<OrgLicensesResponse>('/api/licenses', { query: { all: '1' } }),
  { ttlMs: 60_000 },
)

const licenses = computed(() => data.value?.licenses ?? [])

const filteredLicenses = computed(() => {
  if (!appSearch.normalizedQuery.value) return licenses.value
  return licenses.value.filter(license =>
    appSearch.matchesSearch(
      license.title,
      license.clientName,
      license.vendor,
      license.expiryLabel,
    ),
  )
})
</script>

<template>
  <div class="licenses-page">
    <div class="toolbar">
      <div class="toolbar-left">
        <h1 class="page-title">Licenses</h1>
        <p class="text-muted description">
          Software licenses and subscriptions across all clients, sorted by expiry urgency.
        </p>
        <p v-if="!pending && licenses.length > 0" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${filteredLicenses.length} of ${licenses.length}` : licenses.length }}
          {{ licenses.length === 1 ? 'license' : 'licenses' }}
          <span v-if="data?.expiredCount"> · {{ data.expiredCount }} expired</span>
          <span v-if="data?.expiringCount"> · {{ data.expiringCount }} expiring soon</span>
        </p>
      </div>
      <NuxtLink to="/clients" class="btn btn-primary">
        Manage on clients
      </NuxtLink>
    </div>

    <UiPageSearch
      v-if="!pending && !error"
      placeholder="Search licenses..."
    />

    <p v-if="pending && !data" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">Failed to load licenses.</p>
    <div v-else-if="licenses.length === 0" class="card empty">
      <p class="text-muted">No licenses yet. Add them under each client’s Licenses tab.</p>
      <NuxtLink to="/clients" class="btn btn-primary">Go to clients</NuxtLink>
    </div>
    <div v-else-if="filteredLicenses.length === 0" class="card empty">
      <p class="text-muted">No licenses match your search.</p>
    </div>
    <div v-else class="record-list">
      <article v-for="license in filteredLicenses" :key="license.id" class="card record-card">
        <div class="record-header">
          <div>
            <h3>{{ license.title }}</h3>
            <NuxtLink :to="`/clients/${license.clientId}/licenses`" class="client-link">
              {{ license.clientName }}
            </NuxtLink>
          </div>
          <div class="header-badges">
            <span
              v-if="license.expiryStatus === 'expired'"
              class="expiry-badge expired"
            >
              {{ license.expiryLabel }}
            </span>
            <span
              v-else-if="license.expiryStatus === 'soon'"
              class="expiry-badge soon"
            >
              {{ license.expiryLabel }}
            </span>
            <span v-else-if="license.expiryStatus === 'ok'" class="expiry-badge ok">
              {{ license.expiryLabel }}
            </span>
            <span v-else class="text-muted no-expiry">No expiry date</span>
            <NuxtLink :to="license.href" class="btn btn-sm">
              Open on client
            </NuxtLink>
          </div>
        </div>
        <dl v-if="license.vendor || license.expiresAt" class="record-fields">
          <div v-if="license.vendor">
            <dt>Vendor</dt>
            <dd>{{ license.vendor }}</dd>
          </div>
          <div v-if="license.expiresAt">
            <dt>Expires</dt>
            <dd>{{ new Date(license.expiresAt).toLocaleDateString() }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </div>
</template>

<style scoped>
.licenses-page {
  max-width: 960px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.description {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  max-width: 36rem;
}

.count-label {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.record-card {
  padding: 1rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.record-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.client-link {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--primary);
  text-decoration: none;
}

.client-link:hover {
  text-decoration: underline;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.expiry-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.expiry-badge.expired {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.expiry-badge.soon {
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}

.expiry-badge.ok {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.no-expiry {
  font-size: 0.75rem;
}

.record-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem 1.5rem;
  margin: 0.75rem 0 0;
}

.record-fields dt {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.record-fields dd {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
}

.empty {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.error {
  color: var(--danger);
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
</style>
