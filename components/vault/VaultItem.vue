<template>
  <div class="item-row-wrap">
    <NuxtLink :to="`/vault/${item.vaultId}/${item.id}`" class="item-row">
      <span class="type">{{ typeLabel }}</span>
      <span class="name">{{ item.name }}</span>
      <span v-if="item.url" class="url">{{ item.url }}</span>
    </NuxtLink>
    <div v-if="canWrite" class="item-actions">
      <button type="button" class="btn btn-sm" @click="emit('edit')">Edit</button>
      <button type="button" class="btn btn-sm btn-danger" @click="emit('delete')">Delete</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VaultItemRecord, VaultItemType } from '~/types/vault'
import { ITEM_TYPE_LABELS } from '~/types/vault'

const props = defineProps<{
  item: VaultItemRecord
  canWrite?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const typeLabel = computed(() =>
  ITEM_TYPE_LABELS[props.item.itemType as VaultItemType] ?? props.item.itemType,
)
</script>

<style scoped>
.item-row-wrap {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
}

.item-row {
  display: grid;
  grid-template-columns: 6rem 1fr auto;
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
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

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
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
