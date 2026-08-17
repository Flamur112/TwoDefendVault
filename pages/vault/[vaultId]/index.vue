<script setup lang="ts">
import type { VaultItemRecord, VaultSummary } from '~/types/vault'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const vaultId = computed(() => route.params.vaultId as string)
const { user, fetchSession } = useSession()
await fetchSession()

const vault = ref<VaultSummary | null>(null)
const items = ref<VaultItemRecord[]>([])
const loading = ref(true)
const error = ref('')

const canWrite = computed(() => user.value?.role !== 'readonly')

const backLink = computed(() =>
  vault.value?.clientId
    ? `/clients/${vault.value.clientId}/credentials`
    : '/clients',
)

const backLabel = computed(() =>
  vault.value?.clientId ? '← Back to client credentials' : '← Clients',
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [vaultRes, itemsRes] = await Promise.all([
      $fetch<{ vault: VaultSummary }>(`/api/vaults/${vaultId.value}`),
      $fetch<{ items: VaultItemRecord[] }>(`/api/vaults/${vaultId.value}/items`),
    ])
    vault.value = vaultRes.vault
    items.value = itemsRes.items
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number }
    error.value = err.statusCode === 403
      ? 'You do not have access to this vault.'
      : 'Failed to load vault'
  }
  finally {
    loading.value = false
  }
}

await load()
</script>

<template>
  <div class="vault-detail">
    <header class="header">
      <NuxtLink :to="backLink" class="back text-muted">{{ backLabel }}</NuxtLink>
      <h1 class="page-title">{{ vault?.name ?? 'Vault' }}</h1>
    </header>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else>
      <VaultItemForm v-if="canWrite" :vault-id="vaultId" @saved="load" />

      <section class="items-section">
        <h2>Items</h2>
        <p v-if="items.length === 0" class="text-muted">No items yet.</p>
        <div v-else class="items">
          <VaultItem v-for="item in items" :key="item.id" :item="item" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.header { margin-bottom: 1.25rem; }

.back {
  font-size: 0.8125rem;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.35rem;
}

.back:hover { color: var(--primary); }

.items-section h2 {
  font-size: 0.9375rem;
  margin: 1.5rem 0 0.75rem;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.error { color: var(--danger); }
</style>
