<template>
  <div class="vault-list">
    <p v-if="loading">
      Loading vaults…
    </p>
    <p v-else-if="error" class="error">
      {{ error }}
    </p>
    <p v-else-if="vaults.length === 0" class="empty">
      No vaults available.
    </p>
    <ul v-else class="list">
      <li v-for="vault in vaults" :key="vault.id">
        <NuxtLink :to="`/vault/${vault.id}`" class="vault-card">
          <span class="name">{{ vault.name }}</span>
          <span v-if="vault.description" class="desc">{{ vault.description }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { VaultSummary } from '~/types/vault'

const vaults = ref<VaultSummary[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ vaults: VaultSummary[] }>('/api/vaults')
    vaults.value = data.vaults
  }
  catch {
    error.value = 'Failed to load vaults'
  }
  finally {
    loading.value = false
  }
}

await load()
</script>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.vault-card {
  display: block;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  background: var(--card);
}

.vault-card:hover {
  border-color: var(--primary);
}

.name {
  font-weight: 600;
  display: block;
}

.desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.25rem;
  display: block;
}

.error {
  color: var(--danger);
}

.empty {
  color: var(--text-muted);
}
</style>
