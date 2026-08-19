<script setup lang="ts">
import type { VaultItemPayload } from '~/utils/crypto'
import type { VaultDecryptKeyMaterials } from '~/composables/useVaultKey'
import type { VaultItemRecord, VaultSummary } from '~/types/vault'
import { ITEM_TYPE_LABELS, type VaultItemType } from '~/types/vault'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const vaultId = computed(() => route.params.vaultId as string)
const itemId = computed(() => route.params.itemId as string)

const { user } = useSession()
const canWrite = computed(() => user.value?.role !== 'readonly')

const vault = ref<VaultSummary | null>(null)
const item = ref<VaultItemRecord | null>(null)
const decrypted = ref<VaultItemPayload | null>(null)
const loading = ref(true)
const error = ref('')
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const { decryptVaultPayload, loadKey } = useVaultKey()

const showTotpCode = ref(false)

function onTotpToggle(event: Event) {
  const details = event.target as HTMLDetailsElement
  showTotpCode.value = details.open
}

const typeLabel = computed(() =>
  item.value
    ? ITEM_TYPE_LABELS[item.value.itemType as VaultItemType] ?? item.value.itemType
    : '',
)

const backLink = computed(() =>
  vault.value?.clientId
    ? `/clients/${vault.value.clientId}/credentials`
    : `/vault/${vaultId.value}`,
)

const backLabel = computed(() =>
  vault.value?.clientId ? '← Client credentials' : `← ${vault.value?.name ?? 'Vault'}`,
)

async function load() {
  loading.value = true
  error.value = ''
  decrypted.value = null

  try {
    const [vaultRes, itemRes] = await Promise.all([
      $fetch<{ vault: VaultSummary }>(`/api/vaults/${vaultId.value}`),
      $fetch<{ item: VaultItemRecord, decryptKeys: VaultDecryptKeyMaterials }>(`/api/items/${itemId.value}`),
    ])

    if (itemRes.item.vaultId !== vaultId.value) {
      error.value = 'Item not found in this vault.'
      return
    }

    vault.value = vaultRes.vault
    item.value = itemRes.item

    await loadKey()
    decrypted.value = await decryptVaultPayload(itemRes.item.encryptedData, itemRes.decryptKeys)
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number }
    error.value = err.statusCode === 403
      ? 'You do not have access to this item.'
      : 'Failed to load or decrypt credential — try signing out and back in'
  }
  finally {
    loading.value = false
  }
}

await load()

function onItemSaved() {
  showEdit.value = false
  load()
}

async function confirmDelete() {
  if (!item.value) return
  deleting.value = true
  error.value = ''
  try {
    await $fetch(`/api/items/${item.value.id}`, { method: 'DELETE' })
    await router.push(backLink.value)
  }
  catch {
    error.value = 'Failed to delete credential'
  }
  finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <div class="item-detail">
    <header class="header">
      <NuxtLink :to="backLink" class="back text-muted">{{ backLabel }}</NuxtLink>
      <div class="title-row">
        <div>
          <h1 class="page-title">{{ item?.name ?? 'Item' }}</h1>
          <p v-if="item" class="meta text-muted">
            {{ typeLabel }}
            <span v-if="item.url"> · {{ item.url }}</span>
          </p>
        </div>
        <div v-if="canWrite && item" class="header-actions">
          <button type="button" class="btn btn-sm" @click="showEdit = true">Edit</button>
          <button type="button" class="btn btn-sm btn-danger" @click="showDeleteConfirm = true">
            Delete
          </button>
        </div>
      </div>
    </header>

    <p v-if="loading" class="text-muted">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <section v-else-if="decrypted" class="fields">
      <div v-if="decrypted.username" class="field card">
        <span class="label">Username</span>
        <div class="field-row">
          <code class="plain-value">{{ decrypted.username }}</code>
          <UiCopyButton :value="decrypted.username" />
        </div>
      </div>
      <div v-if="decrypted.password" class="field card">
        <span class="label">Password</span>
        <div class="field-row">
          <UiSecretField :model-value="decrypted.password" readonly />
          <UiCopyButton :value="decrypted.password" />
        </div>
      </div>
      <div v-if="decrypted.totp_secret" class="field card totp-field">
        <details @toggle="onTotpToggle">
          <summary class="label summary-label">Authenticator (MFA)</summary>
          <div v-if="showTotpCode" class="totp-content">
            <CryptoTOTPDisplay :secret="decrypted.totp_secret" />
          </div>
          <details class="secret-details">
            <summary class="text-muted">Show setup secret</summary>
            <div class="field-row">
              <UiSecretField :model-value="decrypted.totp_secret" readonly />
              <UiCopyButton :value="decrypted.totp_secret" />
            </div>
          </details>
        </details>
      </div>
      <div v-if="decrypted.notes" class="field card">
        <span class="label">Notes</span>
        <div class="field-row field-row--stack">
          <UiSecretField :model-value="decrypted.notes" readonly />
          <UiCopyButton :value="decrypted.notes" />
        </div>
      </div>
    </section>

    <div v-if="showEdit && item" class="modal-backdrop" @click.self="showEdit = false">
      <div class="modal card modal-wide">
        <VaultItemForm
          :vault-id="vaultId"
          :item-id="item.id"
          @saved="onItemSaved"
        />
        <button type="button" class="btn close-form" @click="showEdit = false">Close</button>
      </div>
    </div>

    <div v-if="showDeleteConfirm && item" class="modal-backdrop" @click.self="showDeleteConfirm = false">
      <div class="modal card">
        <h3>Delete credential</h3>
        <p>Delete <strong>{{ item.name }}</strong>? This cannot be undone.</p>
        <div class="modal-actions">
          <button type="button" class="btn" @click="showDeleteConfirm = false">Cancel</button>
          <button type="button" class="btn btn-danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back {
  font-size: 0.8125rem;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.35rem;
}

.back:hover { color: var(--primary); }

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}

.meta { margin-top: 0.25rem; font-size: 0.875rem; }

.fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-row--stack { flex-wrap: wrap; }

.field-row :deep(.secret-field) {
  flex: 1;
  min-width: 0;
}

.plain-value {
  flex: 1;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.error { color: var(--danger); }

.totp-field {
  border-color: rgba(79, 110, 247, 0.35);
}

.summary-label {
  cursor: pointer;
  margin-bottom: 0;
}

.totp-content {
  margin-top: 0.75rem;
}

.secret-details {
  margin-top: 0.75rem;
}

.secret-details summary {
  cursor: pointer;
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}

.secret-details .field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.close-form {
  margin-top: 0.75rem;
  width: 100%;
}
</style>
