<template>
  <NuxtLink :to="`/clients/${client.id}`" class="client-card card">
    <div class="logo-wrap">
      <ClientsClientLogo
        :src="client.logoUrl"
        :alt="client.name"
        :size="48"
        :cache-key="client.updatedAt"
      />
    </div>
    <div class="info">
      <div class="name-row">
        <span class="item-name">{{ client.name }}</span>
        <span v-if="client.isFavorite" class="favorite-star favorite-star--lg" title="Favorite">★</span>
      </div>
      <span v-if="client.industry" class="meta-line">{{ client.industry }}</span>
      <span v-if="lastActivity" class="meta-line">{{ lastActivity }}</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { ClientRecord } from '~/types/client'

defineProps<{
  client: ClientRecord
  lastActivity?: string
}>()
</script>

<style scoped>
.client-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}

.client-card:hover {
  border-color: var(--primary);
}

.logo-wrap {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.meta-line + .meta-line {
  margin-top: 0.1rem;
}
</style>
