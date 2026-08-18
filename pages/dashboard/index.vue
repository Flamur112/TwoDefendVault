<script setup lang="ts">
import type { DashboardData } from '~/types/dashboard'

definePageMeta({ middleware: 'auth' })

const { user } = useSession()
const apiFetch = useApiFetch()
const { delightType, triggerLoginDelight } = useLoginDelight()

const { data, pending, error } = useFetch<DashboardData>('/api/dashboard', {
  key: 'dashboard',
  lazy: true,
  server: false,
  $fetch: apiFetch,
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => user.value?.displayName?.split(' ')[0] || 'there')
const hasFavorites = computed(() => (data.value?.favorites.length ?? 0) > 0)
const userSeed = computed(() => user.value?.id ?? user.value?.email ?? 'guest')
const showConfetti = computed(() => delightType.value === 'confetti')
const titleSparkle = computed(() => delightType.value === 'sparkle')
const kickerGlow = computed(() => delightType.value === 'glow')

onMounted(() => {
  triggerLoginDelight()
})
</script>

<template>
  <div class="dashboard">
    <DashboardLoginDelightConfetti
      v-if="showConfetti"
      :user-seed="userSeed"
    />

    <header class="dash-hero card">
      <div class="hero-copy">
        <p class="hero-kicker" :class="{ 'hero-kicker--glow': kickerGlow }">TwoDefend Vault</p>
        <h1 class="page-title" :class="{ 'page-title--sparkle': titleSparkle }">
          {{ greeting }}, {{ firstName }}
        </h1>
        <p class="subtitle">
          Jump straight to starred clients, recently updated credentials, or team activity.
        </p>
      </div>
      <div v-if="pending && !data" class="hero-stats skeleton-stats" aria-hidden="true">
        <span v-for="n in 3" :key="n" class="skeleton-stat" />
      </div>
      <div v-else class="hero-stats">
        <div class="hero-stat hero-stat--clients">
          <span class="hero-stat-value">{{ data?.stats.clientCount ?? 0 }}</span>
          <span class="hero-stat-label">Clients</span>
        </div>
        <div class="hero-stat hero-stat--credentials">
          <span class="hero-stat-value">{{ data?.stats.credentialCount ?? 0 }}</span>
          <span class="hero-stat-label">Credentials</span>
        </div>
        <div class="hero-stat hero-stat--favorites">
          <span class="hero-stat-value">{{ data?.stats.favoriteCount ?? 0 }}</span>
          <span class="hero-stat-label">Starred</span>
        </div>
      </div>
    </header>

    <p v-if="error" class="error">Failed to load dashboard.</p>

    <template v-else>
      <DashboardClientPanel
        class="favorites-section"
        title="Starred clients"
        :clients="data?.favorites ?? []"
        :loading="pending"
        empty-text="Star clients from the Clients page to pin them here for quick access."
      />

      <div v-if="hasFavorites || pending" class="grid-secondary">
        <DashboardRecentCredentialsPanel
          :credentials="data?.recentCredentials ?? []"
          :loading="pending"
        />
        <DashboardActivityPanel
          :entries="data?.recentActivity ?? []"
          :loading="pending"
        />
      </div>

      <section v-else-if="!pending" class="card follow-up">
        <p class="follow-up-title">Get started</p>
        <p class="text-muted follow-up-copy">
          Star a few clients you work with often. Credentials and activity will show up here automatically.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1280px;
}

.dash-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  padding: 1.35rem 1.5rem;
}

.hero-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-violet);
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  color: var(--text);
  font-weight: 700;
}

.page-title--sparkle {
  animation: title-sparkle 2.8s ease-out;
}

.hero-kicker--glow {
  animation: kicker-glow 2.8s ease-out;
}

@keyframes title-sparkle {
  0%, 100% {
    text-shadow: none;
  }

  45% {
    text-shadow: 0 0 16px rgba(167, 139, 250, 0.22);
  }
}

@keyframes kicker-glow {
  0%, 100% {
    opacity: 1;
    letter-spacing: 0.08em;
  }

  45% {
    letter-spacing: 0.1em;
    text-shadow: 0 0 10px rgba(167, 139, 250, 0.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-title--sparkle,
  .hero-kicker--glow {
    animation: none;
  }
}

.subtitle {
  margin: 0.5rem 0 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
  max-width: 34rem;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(88px, 1fr));
  gap: 0.75rem;
  flex-shrink: 0;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-subtle);
  min-width: 88px;
}

.hero-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
}

.hero-stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hero-stat--clients .hero-stat-value { color: #ddd6fe; }
.hero-stat--clients .hero-stat-label { color: var(--accent-violet); }
.hero-stat--credentials .hero-stat-value { color: #99f6e4; }
.hero-stat--credentials .hero-stat-label { color: var(--accent-teal); }
.hero-stat--favorites .hero-stat-value { color: #fde68a; }
.hero-stat--favorites .hero-stat-label { color: var(--favorite); }

.skeleton-stats {
  min-width: 280px;
}

.skeleton-stat {
  display: block;
  height: 72px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--card) 50%, var(--bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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

.follow-up {
  padding: 1.25rem 1.35rem;
}

.follow-up-title {
  margin: 0 0 0.35rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.follow-up-copy {
  margin: 0;
  font-size: 0.875rem;
}

.error {
  color: var(--danger);
}

@media (max-width: 960px) {
  .dash-hero {
    flex-direction: column;
  }

  .hero-stats,
  .skeleton-stats {
    width: 100%;
  }

  .grid-secondary {
    grid-template-columns: 1fr;
  }
}
</style>
