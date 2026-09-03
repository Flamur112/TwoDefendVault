<script setup lang="ts">
import type { ClientStats } from '~/types/client'
import type { OrgLicenseRow } from '~/types/licenses'

const ctx = inject<{ client: Ref<{ name: string, industry: string | null, website: string | null, phone: string | null, onboardedAt: string | null } | null>, clientId: Ref<string> }>('clientContext')!
const client = ctx.client
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const { activity, loading: loadingActivity, load: loadActivity } = useClientActivity(clientId, { limit: 50 })

const { data: statsData, pending: loadingStats } = useCachedAsyncData(
  computed(() => `client-stats-${clientId.value}`),
  () => apiFetch<{ stats: ClientStats, licenseAlerts: OrgLicenseRow[] }>(
    `/api/clients/${clientId.value}/stats`,
  ),
  { ttlMs: 60_000 },
)

const stats = computed(() => statsData.value?.stats ?? null)
const licenseAlerts = computed(() => statsData.value?.licenseAlerts ?? [])

const hasLicenseAlerts = computed(() =>
  (stats.value?.expiredLicenseCount ?? 0) + (stats.value?.expiringLicenseCount ?? 0) > 0,
)

await loadActivity()
</script>

<template>
  <div v-if="client" class="overview">
    <ClientsWorkspaceGuide :client-id="clientId" />

    <div class="info-grid">
      <div class="card info-card">
        <h3>Contact</h3>
        <dl>
          <div v-if="client.website">
            <dt>Website</dt>
            <dd><a :href="client.website" target="_blank" rel="noopener">{{ client.website }}</a></dd>
          </div>
          <div v-if="client.phone">
            <dt>Phone</dt>
            <dd>{{ client.phone }}</dd>
          </div>
          <div v-if="client.onboardedAt">
            <dt>Onboarded</dt>
            <dd>{{ new Date(client.onboardedAt).toLocaleDateString() }}</dd>
          </div>
        </dl>
      </div>

      <div class="stats-row">
        <div class="card stat">
          <span class="stat-value">{{ loadingStats ? '…' : (stats?.credentialCount ?? 0) }}</span>
          <span class="stat-label text-muted">Credentials</span>
        </div>
        <div class="card stat">
          <span class="stat-value">{{ loadingStats ? '…' : (stats?.vaultCount ?? 0) }}</span>
          <span class="stat-label text-muted">Vaults</span>
        </div>
        <div class="card stat">
          <span class="stat-value">{{ loadingStats ? '…' : (stats?.projectCount ?? 0) }}</span>
          <span class="stat-label text-muted">Open Projects</span>
        </div>
      </div>
    </div>

    <div v-if="hasLicenseAlerts" class="card license-alerts">
      <div class="alerts-header">
        <h3>License alerts</h3>
        <NuxtLink :to="`/clients/${clientId}/licenses`" class="view-link">View licenses</NuxtLink>
      </div>
      <ul class="alert-list">
        <li v-for="license in licenseAlerts" :key="license.id">
          <span class="alert-title">{{ license.title }}</span>
          <span
            class="expiry-tag"
            :class="license.expiryStatus === 'expired' ? 'expired' : 'soon'"
          >
            {{ license.expiryLabel }}
          </span>
        </li>
      </ul>
    </div>

    <div class="card activity-section">
      <ClientsActivityFeed
        :entries="activity"
        :loading="loadingActivity"
        title="Recent Activity"
        :retention-days="14"
        show-filters
        :initial-limit="10"
      />
    </div>
  </div>
</template>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .info-grid { grid-template-columns: 1fr; }
}

.info-card h3 {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
}

dl div {
  margin-bottom: 0.5rem;
}

dt {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

dd {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
}

.stats-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
  padding: 1.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.activity-section {
  margin-top: 0;
  padding: 1rem;
}

.license-alerts {
  padding: 1rem;
  margin-bottom: 1rem;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.alerts-header h3 {
  margin: 0;
  font-size: 0.875rem;
}

.view-link {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.view-link:hover {
  text-decoration: underline;
}

.alert-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.alert-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.8125rem;
}

.alert-list li:last-child {
  border-bottom: none;
}

.alert-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expiry-tag {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.expiry-tag.expired {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.expiry-tag.soon {
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}
</style>
