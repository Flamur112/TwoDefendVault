<script setup lang="ts">
import type { ClientRecord } from '~/types/client'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const clientId = computed(() => route.params.clientId as string)
const clientIdValue = computed(() => clientId.value)
const { track } = useRecentClients()
const apiFetch = useApiFetch()

const client = ref<ClientRecord | null>(null)
const loading = ref(true)
const error = ref('')

async function loadClient() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ client: ClientRecord }>(`/api/clients/${clientId.value}`)
    client.value = data.client
    track(clientId.value)
  }
  catch {
    error.value = 'Client not found or access denied'
    client.value = null
  }
  finally {
    loading.value = false
  }
}

await loadClient()

provide('clientContext', {
  client: readonly(client),
  clientId,
  reload: loadClient,
})
</script>

<template>
  <div class="client-shell">
    <p v-if="loading" class="text-muted">Loading client…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="client">
      <header class="client-header">
        <div class="header-left">
          <img v-if="client.logoUrl" :src="client.logoUrl" :alt="client.name" class="logo">
          <span v-else class="logo-fallback">{{ client.name.slice(0, 2).toUpperCase() }}</span>
          <div>
            <h1 class="page-title">{{ client.name }}</h1>
            <p v-if="client.industry" class="text-muted subtitle">{{ client.industry }}</p>
          </div>
        </div>
      </header>
      <ClientsClientTabs :client-id="clientIdValue" />
      <NuxtPage />
    </template>
  </div>
</template>

<style scoped>
.client-header {
  margin-bottom: 0.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo, .logo-fallback {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  flex-shrink: 0;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}

.subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
}

.error { color: var(--danger); }
</style>
