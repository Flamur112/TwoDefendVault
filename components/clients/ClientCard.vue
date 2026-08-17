<template>
  <NuxtLink :to="`/clients/${client.id}`" class="client-card card">
    <div class="logo-wrap">
      <img v-if="client.logoUrl" :src="client.logoUrl" :alt="client.name" class="logo">
      <span v-else class="logo-fallback">{{ initials }}</span>
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

const props = defineProps<{
  client: ClientRecord
  lastActivity?: string
}>()

const initials = computed(() =>
  props.client.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
)
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

.logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
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
