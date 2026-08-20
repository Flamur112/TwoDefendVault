<script setup lang="ts">
import type { ClientStats } from '~/types/client'

const ctx = inject<{ client: Ref<{ name: string, industry: string | null, website: string | null, phone: string | null, onboardedAt: string | null } | null>, clientId: Ref<string> }>('clientContext')!
const client = ctx.client
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const { activity, loading: loadingActivity, load: loadActivity } = useClientActivity(clientId, { limit: 50 })

const stats = ref<ClientStats | null>(null)
const loadingStats = ref(true)

async function loadStats() {
  loadingStats.value = true
  try {
    const data = await apiFetch<{ stats: ClientStats }>(`/api/clients/${clientId.value}/stats`)
    stats.value = data.stats
  }
  finally {
    loadingStats.value = false
  }
}

await loadStats()
onMounted(() => {
  loadActivity()
})
</script>

<template>
  <div v-if="client" class="overview">
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
}
</style>
