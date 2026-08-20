<template>
  <div
    :id="`credential-${item.id}`"
    class="credential"
    :class="{ open: expanded, highlighted }"
  >
    <div class="credential-top">
      <button type="button" class="credential-header" @click="toggle">
        <span class="chevron" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
        <span class="name">{{ item.name }}</span>
        <span class="type">{{ typeLabel }}</span>
        <span v-if="item.url" class="url">{{ item.url }}</span>
      </button>

      <div v-if="canWrite" class="credential-actions" @click.stop>
        <button type="button" class="btn btn-sm" title="Edit credential" @click="emit('edit')">
          Edit
        </button>
        <button type="button" class="btn btn-sm btn-danger" title="Delete credential" @click="emit('delete')">
          Delete
        </button>
      </div>
    </div>

    <div v-if="expanded" class="credential-body">
      <p v-if="loading" class="text-muted">Decrypting…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else-if="decrypted">
        <div v-if="decrypted.username" class="field">
          <span class="label">Username</span>
          <div class="field-row">
            <code class="plain-value">{{ decrypted.username }}</code>
            <UiCopyButton :value="decrypted.username" />
          </div>
        </div>
        <div v-if="decrypted.password" class="field">
          <span class="label">Password</span>
          <div class="field-row">
            <UiSecretField :model-value="decrypted.password" readonly />
            <UiCopyButton :value="decrypted.password" />
          </div>
        </div>
        <div v-if="decrypted.totp_secret" class="field totp-field">
          <details class="totp-details" @toggle="onTotpToggle">
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
        <div v-if="decrypted.notes" class="field">
          <span class="label">Notes</span>
          <div class="field-row field-row--stack">
            <UiSecretField :model-value="decrypted.notes" readonly />
            <UiCopyButton :value="decrypted.notes" />
          </div>
        </div>
        <div v-if="decrypted.recovery_codes?.length" class="field">
          <span class="label">Recovery codes</span>
          <ul class="recovery-list">
            <li v-for="(code, idx) in decrypted.recovery_codes" :key="idx">
              <code>{{ code }}</code>
              <UiCopyButton :value="code" />
            </li>
          </ul>
        </div>
        <div
          v-for="field in decrypted.custom_fields ?? []"
          :key="field.key"
          class="field"
        >
          <span class="label">{{ field.key }}</span>
          <div class="field-row">
            <UiSecretField :model-value="field.value" readonly />
            <UiCopyButton :value="field.value" />
          </div>
        </div>
        <p
          v-if="!hasVisibleFields"
          class="text-muted empty-fields"
        >
          No stored fields for this credential.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VaultItemPayload } from '~/utils/crypto'
import type { VaultDecryptKeyMaterials } from '~/composables/useVaultKey'
import type { VaultItemRecord, VaultItemType } from '~/types/vault'
import { ITEM_TYPE_LABELS } from '~/types/vault'

const props = defineProps<{
  item: VaultItemRecord
  initialExpanded?: boolean
  highlighted?: boolean
  canWrite?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const { decryptVaultPayload, error: keyError } = useVaultKey()

const expanded = ref(props.initialExpanded ?? false)
const loading = ref(false)
const error = ref('')
const decrypted = ref<VaultItemPayload | null>(null)
const showTotpCode = ref(false)

function onTotpToggle(event: Event) {
  const details = event.target as HTMLDetailsElement
  showTotpCode.value = details.open
}

const typeLabel = computed(() =>
  ITEM_TYPE_LABELS[props.item.itemType as VaultItemType] ?? props.item.itemType,
)

const hasVisibleFields = computed(() => {
  if (!decrypted.value) return false
  const d = decrypted.value
  return Boolean(
    d.username
    || d.password
    || d.totp_secret
    || d.notes
    || d.recovery_codes?.length
    || d.custom_fields?.length,
  )
})

async function decrypt() {
  if (decrypted.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const apiFetch = useApiFetch()
    const data = await apiFetch<{
      item: VaultItemRecord
      decryptKeys?: VaultDecryptKeyMaterials
    }>(`/api/items/${props.item.id}`)

    const encryptedData = data.item.encryptedData ?? props.item.encryptedData
    if (!encryptedData) {
      throw new Error('Missing encrypted payload')
    }

    decrypted.value = await decryptVaultPayload(encryptedData, data.decryptKeys)
  }
  catch (e: unknown) {
    if (keyError.value) {
      error.value = keyError.value
    }
    else if (e instanceof Error && e.message.includes('Missing encrypted')) {
      error.value = 'Credential data is missing'
    }
    else {
      error.value = 'Failed to decrypt credential. Try signing out and back in.'
    }
  }
  finally {
    loading.value = false
  }
}

async function toggle() {
  expanded.value = !expanded.value
  if (!expanded.value) {
    showTotpCode.value = false
  }
  if (expanded.value) {
    await decrypt()
  }
}

async function openCredential() {
  if (expanded.value) return
  expanded.value = true
  await decrypt()
}

watch(() => props.initialExpanded, (value) => {
  if (value) openCredential()
})

onMounted(() => {
  if (props.initialExpanded) openCredential()
})
</script>

<style scoped>
.credential {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  overflow: hidden;
}

.credential-top {
  display: flex;
  align-items: stretch;
}

.credential-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.65rem 0 0;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}

.credential.open {
  border-color: rgba(79, 110, 247, 0.45);
  background: var(--card);
}

.credential.highlighted {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(79, 110, 247, 0.35);
}

.credential-header {
  display: grid;
  grid-template-columns: 1.25rem 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.credential-header:hover {
  background: rgba(79, 110, 247, 0.06);
}

.chevron {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.name {
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  white-space: nowrap;
}

.url {
  font-size: 0.8125rem;
  color: var(--text-muted);
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credential-body {
  padding: 0 1rem 1rem 2.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.label {
  display: block;
  font-size: 0.6875rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-row--stack {
  flex-wrap: wrap;
}

.field-row :deep(.secret-field) {
  flex: 1;
  min-width: 0;
}

.plain-value {
  flex: 1;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.totp-field {
  padding-top: 0.25rem;
}

.totp-details {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}

.summary-label {
  cursor: pointer;
  margin-bottom: 0;
}

.totp-content {
  margin-top: 0.75rem;
}

.secret-details summary {
  cursor: pointer;
  font-size: 0.8125rem;
  margin-bottom: 0.35rem;
}

.recovery-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.recovery-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.recovery-list code {
  font-family: ui-monospace, monospace;
}

.error {
  color: var(--danger);
  margin: 0;
}

.empty-fields {
  margin: 0;
  font-size: 0.875rem;
}
</style>
