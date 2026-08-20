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
watch(clientId, loadClient)

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
          <ClientsClientLogo
            :src="client.logoUrl"
            :alt="client.name"
            :size="56"
            :cache-key="client.updatedAt"
            class="header-logo"
          />
          <div>
            <h1 class="page-title">{{ client.name }}</h1>
            <p v-if="client.industry" class="text-muted subtitle">{{ client.industry }}</p>
          </div>
        </div>
      </header>
      <ClientsClientTabs :client-id="clientIdValue" />
      <NuxtPage keepalive :page-key="route => route.path" />
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

.header-logo :deep(.client-logo),
.header-logo :deep(.client-logo-fallback) {
  border-radius: 10px;
}

.subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
}

.error { color: var(--danger); }
</style>
