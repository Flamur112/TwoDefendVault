<template>
  <NuxtLink :to="`/vault/${item.vaultId}/${item.id}`" class="item-row">
    <span class="type">{{ typeLabel }}</span>
    <span class="name">{{ item.name }}</span>
    <span v-if="item.url" class="url">{{ item.url }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { VaultItemRecord, VaultItemType } from '~/types/vault'
import { ITEM_TYPE_LABELS } from '~/types/vault'

const props = defineProps<{ item: VaultItemRecord }>()

const typeLabel = computed(() =>
  ITEM_TYPE_LABELS[props.item.itemType as VaultItemType] ?? props.item.itemType,
)
</script>

<style scoped>
.item-row {
  display: grid;
  grid-template-columns: 6rem 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  background: var(--bg);
}

.item-row:hover {
  border-color: var(--primary);
  background: var(--card);
}

.type {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.name {
  font-weight: 500;
}

.url {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
