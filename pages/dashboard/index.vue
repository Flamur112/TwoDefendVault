<script setup lang="ts">
import type { DashboardData } from '~/types/dashboard'

definePageMeta({ middleware: 'auth' })

const { user, fetchSession } = useSession()

await fetchSession()

const { data, pending, error } = await useFetch<DashboardData>('/api/dashboard', {
  key: 'dashboard',
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})
</script>

<template>
  <div class="dashboard">
    <header class="dash-header">
      <h1 class="page-title">{{ greeting }}, {{ user?.displayName?.split(' ')[0] || 'there' }}</h1>
      <p class="subtitle">
        Overview of your organization — stats, favorites, credentials, and activity.
      </p>
    </header>

    <p v-if="error" class="error">Failed to load dashboard.</p>

    <template v-else>
      <div class="stats-row">
        <DashboardStatCard label="Clients" :value="data?.stats.clientCount ?? 0" tone="clients" />
        <DashboardStatCard label="Credentials" :value="data?.stats.credentialCount ?? 0" tone="credentials" />
        <DashboardStatCard label="Favorites" :value="data?.stats.favoriteCount ?? 0" tone="favorites" />
      </div>

      <DashboardClientPanel
        class="favorites-section"
        title="Starred clients"
        :clients="data?.favorites ?? []"
        :loading="pending"
        empty-text="Star clients to keep them here for quick access."
      />

      <div class="grid-secondary">
        <DashboardRecentCredentialsPanel
          :credentials="data?.recentCredentials ?? []"
          :loading="pending"
        />
        <DashboardActivityPanel
          :entries="data?.recentActivity ?? []"
          :loading="pending"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1280px;
}

.dash-header {
  margin-bottom: 1.5rem;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #9eb4ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin: 0.5rem 0 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
  max-width: 40rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.favorites-section {
  margin-bottom: 1.25rem;
}

.grid-secondary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.error {
  color: var(--danger);
}

@media (max-width: 960px) {
  .stats-row,
  .grid-secondary {
    grid-template-columns: 1fr;
  }
}
</style>
