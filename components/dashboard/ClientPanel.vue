<template>
  <section class="panel card panel--favorites">
    <div class="panel-header">
      <span class="panel-kicker panel-kicker--favorites">Favorites</span>
      <h2 class="panel-title">{{ title }}</h2>
      <p v-if="!loading && clients.length > 0" class="panel-count">{{ clients.length }} starred</p>
    </div>

    <p v-if="loading" class="empty">Loading…</p>
    <div v-else-if="clients.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">★</span>
      <p class="empty">{{ emptyText }}</p>
    </div>
    <ul v-else class="client-grid">
      <li v-for="client in clients" :key="client.id">
        <NuxtLink :to="`/clients/${client.id}`" class="client-card">
          <span class="avatar">{{ initialsForName(client.name) }}</span>
          <div class="info">
            <span class="client-name">{{ client.name }}</span>
            <span v-if="client.industry" class="industry">{{ client.industry }}</span>
          </div>
          <span class="favorite-star" title="Favorite">★</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ClientRecord } from '~/types/client'
import { initialsForName } from '~/utils/avatar'

withDefaults(defineProps<{
  title: string
  clients: ClientRecord[]
  loading?: boolean
  emptyText?: string
}>(), {
  emptyText: 'Star clients to keep them here for quick access.',
})
</script>

<style scoped>
.panel--favorites {
  margin-bottom: 0;
  padding: 1.15rem 1.25rem 1.25rem;
}

.panel-header {
  margin-bottom: 1rem;
}

.panel-title {
  margin: 0.15rem 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.panel-count {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.client-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
}

.client-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  min-height: 132px;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: border-color 0.15s;
}

.client-card:hover {
  border-color: rgba(251, 191, 36, 0.45);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--accent-violet);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
  width: 100%;
  padding-right: 1.5rem;
}

.client-name {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  background: linear-gradient(135deg, #ffffff 0%, #b4c4ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.industry {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.favorite-star {
  position: absolute;
  top: 0.95rem;
  right: 1rem;
  color: var(--favorite);
  font-size: 1.25rem;
  line-height: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 2.5rem 1.5rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
}

.empty-icon {
  font-size: 2rem;
  color: var(--favorite);
  opacity: 0.7;
}

.empty {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0;
  text-align: center;
  max-width: 22rem;
}

@media (max-width: 640px) {
  .client-grid {
    grid-template-columns: 1fr;
  }
}
</style>
