<template>
  <div class="client-row card">
    <NuxtLink :to="`/clients/${client.id}`" class="client-link">
      <div class="logo-wrap">
        <ClientsClientLogo
          :src="client.logoUrl"
          :alt="client.name"
          :size="40"
          :cache-key="client.updatedAt"
        />
      </div>
      <div class="info">
        <div class="name-row">
          <span class="item-name">{{ client.name }}</span>
          <span v-if="client.isFavorite" class="favorite-star" title="Favorite">★</span>
        </div>
        <span v-if="client.industry" class="meta-line">{{ client.industry }}</span>
      </div>
    </NuxtLink>

    <div v-if="canWrite" class="actions" @click.stop>
      <button
        type="button"
        class="icon-action favorite-btn"
        :class="{ 'favorite-btn--active': client.isFavorite }"
        :title="client.isFavorite ? 'Remove favorite' : 'Add favorite'"
        :disabled="saving"
        @click="toggleFavorite"
      >
        {{ client.isFavorite ? '★' : '☆' }}
      </button>
      <button type="button" class="icon-action" title="Edit client" :disabled="saving" @click="emit('edit', client)">
        ✎
      </button>
      <button
        v-if="canDelete"
        type="button"
        class="icon-action danger"
        title="Delete client"
        :disabled="saving"
        @click="emit('delete', client)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClientRecord } from '~/types/client'

const props = defineProps<{
  client: ClientRecord
  canWrite: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{
  edit: [client: ClientRecord]
  delete: [client: ClientRecord]
  updated: [client: ClientRecord]
}>()

const saving = ref(false)

async function toggleFavorite() {
  saving.value = true
  try {
    const data = await $fetch<{ client: ClientRecord }>(`/api/clients/${props.client.id}`, {
      method: 'PATCH',
      body: { isFavorite: !props.client.isFavorite },
    })
    emit('updated', data.client)
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.client-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
}

.client-link {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.logo-wrap {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.info {
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.icon-action {
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1;
}

.icon-action:hover:not(:disabled) {
  border-color: var(--border);
  color: var(--text);
  background: var(--bg);
}

.favorite-btn {
  font-size: 1.2rem;
  padding: 0.3rem 0.55rem;
  color: var(--text-muted);
}

.favorite-btn:hover:not(:disabled) {
  color: var(--favorite);
  border-color: rgba(251, 191, 36, 0.35);
  background: var(--favorite-soft);
}

.favorite-btn--active {
  color: var(--favorite);
  border-color: rgba(251, 191, 36, 0.45);
  background: var(--favorite-soft);
}

.icon-action.danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}

.icon-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
