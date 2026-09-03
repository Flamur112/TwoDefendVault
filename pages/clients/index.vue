<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import type { ClientRecord } from '~/types/client'

const { user } = useSession()
const apiFetch = useApiFetch()

const appSearch = useAppSearch()
useAppSearchPlaceholder('Search clients...')

const { data, pending, error, refresh } = useCachedAsyncData(
  'clients-list',
  () => apiFetch<{ clients: ClientRecord[] }>('/api/clients'),
  { ttlMs: 60_000 },
)

const clients = computed(() => data.value?.clients ?? [])
const loading = computed(() => pending.value && !data.value)

const showNew = ref(false)
const newName = ref('')
const creating = ref(false)

const editing = ref<ClientRecord | null>(null)
const editName = ref('')
const editIndustry = ref('')
const saving = ref(false)

const deleting = ref<ClientRecord | null>(null)
const deletingInProgress = ref(false)

const canWrite = computed(() => user.value?.role === 'admin' || user.value?.role === 'member')
const canDelete = computed(() => user.value?.role === 'admin')

const filteredClients = computed(() => {
  if (!appSearch.normalizedQuery.value) return clients.value
  return clients.value.filter(client =>
    appSearch.matchesSearch(client.name, client.industry, client.slug),
  )
})

const clientCount = computed(() => filteredClients.value.length)
const loadError = ref('')

function onClientUpdated(updated: ClientRecord) {
  if (!data.value) return
  const idx = data.value.clients.findIndex(c => c.id === updated.id)
  if (idx !== -1) data.value.clients[idx] = updated
}

function openEdit(client: ClientRecord) {
  editing.value = client
  editName.value = client.name
  editIndustry.value = client.industry ?? ''
}

async function saveEdit() {
  if (!editing.value || !editName.value.trim()) return
  saving.value = true
  loadError.value = ''
  try {
    const data = await $fetch<{ client: ClientRecord }>(`/api/clients/${editing.value.id}`, {
      method: 'PATCH',
      body: {
        name: editName.value.trim(),
        industry: editIndustry.value.trim() || null,
      },
    })
    onClientUpdated(data.client)
    editing.value = null
  }
  catch {
    loadError.value = 'Failed to save client'
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleting.value) return
  deletingInProgress.value = true
  loadError.value = ''
  try {
    await $fetch(`/api/clients/${deleting.value.id}`, { method: 'DELETE' })
    invalidateCachedAsyncData('clients-list')
    await refresh()
    deleting.value = null
  }
  catch {
    loadError.value = 'Failed to delete client'
  }
  finally {
    deletingInProgress.value = false
  }
}

async function createClient() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const data = await $fetch<{ client: ClientRecord }>('/api/clients', {
      method: 'POST',
      body: { name: newName.value.trim() },
    })
    showNew.value = false
    newName.value = ''
    await navigateTo(`/clients/${data.client.id}`)
  }
  catch {
    loadError.value = 'Failed to create client'
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="clients-page">
    <div class="toolbar">
      <h1 class="page-title">
        All clients
        <span v-if="!loading && !error" class="count text-muted">{{ clientCount }}</span>
      </h1>
      <UiPageSearch
        v-if="!loading && !error"
        inline
        placeholder="Search clients..."
        class="toolbar-search"
      />
      <div class="toolbar-actions">
        <button v-if="canWrite" type="button" class="btn btn-primary" @click="showNew = true">
          New Client
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error || loadError" class="error">{{ loadError || 'Failed to load clients' }}</p>
    <div v-else-if="clients.length === 0" class="card empty-state">
      <p class="text-muted">No clients found.</p>
      <button v-if="canWrite" type="button" class="btn btn-primary" @click="showNew = true">
        Create your first client
      </button>
    </div>
    <div v-else-if="filteredClients.length === 0" class="card empty-state">
      <p class="text-muted">No clients match your search.</p>
    </div>
    <div v-else class="client-list">
      <ClientsClientListItem
        v-for="client in filteredClients"
        :key="client.id"
        :client="client"
        :can-write="canWrite"
        :can-delete="canDelete"
        @edit="openEdit"
        @delete="deleting = $event"
        @updated="onClientUpdated"
      />
    </div>

    <!-- New client -->
    <div v-if="showNew" class="modal-backdrop" @click.self="showNew = false">
      <div class="modal card">
        <h2>New Client</h2>
        <label>
          Client name
          <input v-model="newName" type="text" placeholder="Acme Corp" autofocus @keyup.enter="createClient">
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" @click="showNew = false">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="creating || !newName.trim()" @click="createClient">
            {{ creating ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit client -->
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal card">
        <h2>Edit Client</h2>
        <label>
          Client name
          <input v-model="editName" type="text" required @keyup.enter="saveEdit">
        </label>
        <label>
          Industry
          <input v-model="editIndustry" type="text" placeholder="Optional">
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" @click="editing = null">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="saving || !editName.trim()" @click="saveEdit">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="deleting" class="modal-backdrop" @click.self="deleting = null">
      <div class="modal card">
        <h2>Delete Client</h2>
        <p>Delete <strong>{{ deleting.name }}</strong>? Vaults will be unlinked but not deleted.</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="deleting = null">Cancel</button>
          <button type="button" class="btn btn-danger" :disabled="deletingInProgress" @click="confirmDelete">
            {{ deletingInProgress ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-shrink: 0;
}

.count {
  font-size: 1rem;
  font-weight: 400;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.toolbar-search {
  flex: 1;
  min-width: 12rem;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
}

.search-input {
  min-width: 220px;
}

.client-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
}

.error { color: var(--danger); }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  width: 100%;
  max-width: 400px;
}

.modal h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.modal label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
