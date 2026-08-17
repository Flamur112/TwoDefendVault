<script setup lang="ts">
import type { VaultItemPayload } from '~/utils/crypto'
import type { VaultItemRecord, VaultSummary } from '~/types/vault'
import { decryptPayload } from '~/utils/crypto'
import { ITEM_TYPE_LABELS, type VaultItemType } from '~/types/vault'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const vaultId = computed(() => route.params.vaultId as string)
const itemId = computed(() => route.params.itemId as string)

const vault = ref<VaultSummary | null>(null)
const item = ref<VaultItemRecord | null>(null)
const decrypted = ref<VaultItemPayload | null>(null)
const loading = ref(true)
const error = ref('')

const { loadKey } = useVaultKey()

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
      $fetch<{ item: VaultItemRecord }>(`/api/items/${itemId.value}`),
    ])

    if (itemRes.item.vaultId !== vaultId.value) {
      error.value = 'Item not found in this vault.'
      return
    }

    vault.value = vaultRes.vault
    item.value = itemRes.item

    const key = await loadKey()
    decrypted.value = await decryptPayload(key, itemRes.item.encryptedData)
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number }
    error.value = err.statusCode === 403
      ? 'You do not have access to this item.'
      : 'Failed to load or decrypt item'
  }
  finally {
    loading.value = false
  }
}

await load()
</script>

<template>
  <div class="item-detail">
    <header class="header">
      <NuxtLink :to="backLink" class="back text-muted">{{ backLabel }}</NuxtLink>
      <h1 class="page-title">{{ item?.name ?? 'Item' }}</h1>
      <p v-if="item" class="meta text-muted">
        {{ typeLabel }}
        <span v-if="item.url"> · {{ item.url }}</span>
      </p>
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
</style>
