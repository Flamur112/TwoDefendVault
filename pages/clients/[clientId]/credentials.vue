<script setup lang="ts">
import type { ClientVaultSummary } from '~/types/client'
import { ITEM_TYPE_LABELS, type VaultItemRecord, type VaultItemType } from '~/types/vault'

const { user } = useSession()
const ctx = inject<{ clientId: Ref<string> }>('clientContext')!
const clientId = ctx.clientId
const apiFetch = useApiFetch()
const {
  activity,
  loading: loadingActivity,
  load: loadActivity,
  invalidate: invalidateActivity,
} = useClientActivity(clientId, { filter: 'credentials', limit: 30 })

const vaults = ref<ClientVaultSummary[]>([])
const vaultItems = ref<Record<string, VaultItemRecord[]>>({})
const loading = ref(true)
const error = ref('')
const showNewVault = ref(false)
const newVaultName = ref('')
const savingVault = ref(false)
const addCredentialVaultId = ref<string | null>(null)
const editingCredential = ref<{ id: string, vaultId: string } | null>(null)
const deletingCredential = ref<VaultItemRecord | null>(null)
const deletingCredentialInProgress = ref(false)
const deletingVault = ref<ClientVaultSummary | null>(null)
const deletingVaultInProgress = ref(false)
const appSearch = useAppSearch()
const route = useRoute()

useAppSearchPlaceholder('Search credentials by name, URL, type, or vault...')

const highlightItemId = computed(() =>
  typeof route.query.item === 'string' ? route.query.item : null,
)

const canWrite = computed(() => user.value?.role !== 'readonly')

const totalCredentials = computed(() =>
  vaults.value.reduce((n, v) => n + (vaultItems.value[v.id]?.length ?? 0), 0),
)

function itemMatchesQuery(item: VaultItemRecord, query: string, vaultName: string): boolean {
  const typeLabel = ITEM_TYPE_LABELS[item.itemType as VaultItemType] ?? item.itemType
  return (
    item.name.toLowerCase().includes(query)
    || (item.url?.toLowerCase().includes(query) ?? false)
    || typeLabel.toLowerCase().includes(query)
    || vaultName.toLowerCase().includes(query)
    || (item.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false)
  )
}

const filteredSections = computed(() => {
  const q = appSearch.normalizedQuery.value
  return vaults.value
    .map((vault) => {
      const items = vaultItems.value[vault.id] ?? []
      const filtered = q
        ? items.filter(item => itemMatchesQuery(item, q, vault.name))
        : items
      return { vault, items: filtered }
    })
    .filter(section => !q || section.items.length > 0)
})

const filteredCount = computed(() =>
  filteredSections.value.reduce((n, section) => n + section.items.length, 0),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{
      vaults: ClientVaultSummary[]
      itemsByVault: Record<string, VaultItemRecord[]>
    }>(`/api/clients/${clientId.value}/credentials`)
    vaults.value = data.vaults
    vaultItems.value = data.itemsByVault
  }
  catch {
    error.value = 'Failed to load credentials'
  }
  finally {
    loading.value = false
  }
}

await load()
onMounted(() => {
  loadActivity()
})

function refreshActivity() {
  invalidateActivity()
  loadActivity(true)
}

watch([highlightItemId, loading], async () => {
  if (loading.value || !highlightItemId.value) return
  await nextTick()
  document.getElementById(`credential-${highlightItemId.value}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}, { immediate: true })

function isHighlighted(itemId: string): boolean {
  return highlightItemId.value === itemId
}

async function createVault() {
  if (!newVaultName.value.trim()) return
  savingVault.value = true
  try {
    await $fetch(`/api/clients/${clientId.value}/vaults`, {
      method: 'POST',
      body: { name: newVaultName.value.trim() },
    })
    newVaultName.value = ''
    showNewVault.value = false
    await load()
    refreshActivity()
  }
  catch {
    error.value = 'Failed to create vault'
  }
  finally {
    savingVault.value = false
  }
}

function onCredentialSaved() {
  addCredentialVaultId.value = null
  load()
  refreshActivity()
}

function onCredentialEdited() {
  editingCredential.value = null
  load()
  refreshActivity()
}

function startEditCredential(item: VaultItemRecord) {
  editingCredential.value = { id: item.id, vaultId: item.vaultId }
}

async function confirmDeleteCredential() {
  if (!deletingCredential.value) return
  deletingCredentialInProgress.value = true
  error.value = ''
  try {
    await $fetch(`/api/items/${deletingCredential.value.id}`, { method: 'DELETE' })
    deletingCredential.value = null
    await load()
    refreshActivity()
  }
  catch {
    error.value = 'Failed to delete credential'
  }
  finally {
    deletingCredentialInProgress.value = false
  }
}

async function confirmDeleteVault() {
  if (!deletingVault.value) return
  deletingVaultInProgress.value = true
  error.value = ''
  try {
    await $fetch(`/api/vaults/${deletingVault.value.id}`, { method: 'DELETE' })
    deletingVault.value = null
    await load()
    refreshActivity()
  }
  catch {
    error.value = 'Failed to delete vault'
  }
  finally {
    deletingVaultInProgress.value = false
  }
}
</script>

<template>
  <div class="credentials-tab">
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="section-title">Credentials</h2>
        <p v-if="!loading && vaults.length > 0" class="text-muted count-label">
          {{ appSearch.normalizedQuery.value ? `${filteredCount} of ${totalCredentials}` : totalCredentials }}
          credential{{ totalCredentials === 1 ? '' : 's' }}
        </p>
      </div>
      <div v-if="canWrite" class="actions">
        <button type="button" class="btn" @click="showNewVault = true">Add Vault</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="vaults.length === 0"
          @click="addCredentialVaultId = vaults[0]?.id ?? null"
        >
          Add Credential
        </button>
      </div>
    </div>

    <UiPageSearch
      v-if="!loading && vaults.length > 0"
      placeholder="Search credentials by name, URL, type, or vault..."
    />

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="vaults.length === 0" class="card empty">
      <p class="text-muted">No vaults linked to this client yet.</p>
      <button v-if="canWrite" type="button" class="btn btn-primary" @click="showNewVault = true">
        Add Vault
      </button>
    </div>

    <div v-else-if="appSearch.normalizedQuery.value && filteredCount === 0" class="card empty">
      <p class="text-muted">No credentials match "{{ appSearch.query.value.trim() }}".</p>
    </div>

    <div v-else class="vault-sections">
      <section v-for="{ vault, items } in filteredSections" :key="vault.id" class="card vault-section">
        <div class="vault-header">
          <h3>{{ vault.name }}</h3>
          <div class="vault-header-right">
            <span class="text-muted count">{{ items.length }} items</span>
            <button
              v-if="canWrite"
              type="button"
              class="btn btn-sm btn-danger"
              @click="deletingVault = vault"
            >
              Delete vault
            </button>
          </div>
        </div>
        <p v-if="items.length === 0" class="text-muted empty-items">No credentials in this vault.</p>
        <div v-else class="items">
          <VaultCredentialItem
            v-for="item in items"
            :key="item.id"
            :item="item"
            :can-write="canWrite"
            :initial-expanded="isHighlighted(item.id)"
            :highlighted="isHighlighted(item.id)"
            @edit="startEditCredential(item)"
            @delete="deletingCredential = item"
          />
        </div>
        <button
          v-if="canWrite"
          type="button"
          class="btn add-item-btn"
          @click="addCredentialVaultId = vault.id"
        >
          + Add to {{ vault.name }}
        </button>
      </section>
    </div>

    <div v-if="!loading" class="card activity-section">
      <ClientsActivityFeed
        :entries="activity"
        :loading="loadingActivity"
        title="Credential activity"
        :retention-days="14"
        default-filter="credentials"
        :initial-limit="10"
      />
    </div>

    <div v-if="showNewVault" class="modal-backdrop" @click.self="showNewVault = false">
      <div class="modal card">
        <h3>New Vault</h3>
        <label>
          Vault name
          <input v-model="newVaultName" type="text" placeholder="e.g. Cloud services" @keyup.enter="createVault">
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" @click="showNewVault = false">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="savingVault" @click="createVault">
            {{ savingVault ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="addCredentialVaultId" class="modal-backdrop" @click.self="addCredentialVaultId = null">
      <div class="modal card modal-wide">
        <label v-if="vaults.length > 1" class="vault-picker">
          Vault
          <select v-model="addCredentialVaultId">
            <option v-for="vault in vaults" :key="vault.id" :value="vault.id">
              {{ vault.name }}
            </option>
          </select>
        </label>
        <VaultItemForm :vault-id="addCredentialVaultId" @saved="onCredentialSaved" />
        <button type="button" class="btn close-form" @click="addCredentialVaultId = null">Close</button>
      </div>
    </div>
    <div v-if="editingCredential" class="modal-backdrop" @click.self="editingCredential = null">
      <div class="modal card modal-wide">
        <VaultItemForm
          :vault-id="editingCredential.vaultId"
          :item-id="editingCredential.id"
          @saved="onCredentialEdited"
        />
        <button type="button" class="btn close-form" @click="editingCredential = null">Close</button>
      </div>
    </div>

    <div v-if="deletingCredential" class="modal-backdrop" @click.self="deletingCredential = null">
      <div class="modal card">
        <h3>Delete credential</h3>
        <p>
          Delete <strong>{{ deletingCredential.name }}</strong>?
          This cannot be undone.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="deletingCredential = null">Cancel</button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="deletingCredentialInProgress"
            @click="confirmDeleteCredential"
          >
            {{ deletingCredentialInProgress ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="deletingVault" class="modal-backdrop" @click.self="deletingVault = null">
      <div class="modal card">
        <h3>Delete Vault</h3>
        <p>
          Delete vault <strong>{{ deletingVault.name }}</strong> and all
          {{ vaultItems[deletingVault.id]?.length ?? 0 }} credential(s) inside it?
          This cannot be undone.
        </p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="deletingVault = null">Cancel</button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="deletingVaultInProgress"
            @click="confirmDeleteVault"
          >
            {{ deletingVaultInProgress ? 'Deleting…' : 'Delete vault' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.count-label {
  margin: 0;
  font-size: 0.8125rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.vault-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.vault-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.vault-header h3 {
  margin: 0;
  font-size: 0.9375rem;
}

.vault-header-right {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.count { font-size: 0.8125rem; }

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.add-item-btn {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
}

.empty {
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
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 400px;
}

.modal-wide {
  max-width: 520px;
}

.modal h3 { margin: 0 0 1rem; }

.modal label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.close-form {
  margin-top: 0.75rem;
  width: 100%;
}

.vault-picker {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.activity-section {
  margin-top: 1rem;
}
</style>
