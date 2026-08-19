<template>
  <form class="item-form" @submit.prevent="submit">
    <h3>{{ isEdit ? 'Edit credential' : 'Add credential' }}</h3>

    <p v-if="loading" class="text-muted">Loading credential…</p>

    <template v-else>
      <label>
        Type
        <select v-model="itemType" required>
          <option disabled value="">
            Select a type…
          </option>
          <option v-for="(label, value) in ITEM_TYPE_LABELS" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </label>

      <template v-if="itemType">
        <label>
          Name
          <input v-model="name" type="text" required placeholder="Credential name">
        </label>

        <label v-if="showUrl">
          URL (optional)
          <input v-model="url" type="url" placeholder="https://">
        </label>

        <label v-if="showUsername">
          Username
          <input v-model="username" type="text" autocomplete="off">
        </label>

        <label v-if="showPassword">
          {{ passwordLabel }}
          <UiSecretField v-model="password" />
          <CryptoPasswordGenerator v-if="itemType === 'login'" @generated="password = $event" />
        </label>

        <label v-if="showTotpSecret">
          Authenticator secret
          <UiSecretField v-model="totpSecret" placeholder="Base32 or otpauth:// URI" />
          <span class="hint">Stored encrypted. Codes are generated in your browser only.</span>
        </label>

        <label v-if="showMfaToggle" class="checkbox-row">
          <input v-model="includeMfa" type="checkbox">
          <span>Include MFA / authenticator</span>
        </label>

        <label v-if="showNotes">
          Notes
          <textarea v-model="notes" rows="3" placeholder="Optional notes" />
        </label>

        <label v-if="showRecoveryCodes">
          Recovery codes
          <textarea
            v-model="recoveryCodesText"
            rows="4"
            placeholder="One code per line"
          />
        </label>
      </template>

      <p v-if="error" class="error">
        {{ error }}
      </p>

      <button type="submit" :disabled="saving || !itemType">
        {{ saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save credential' }}
      </button>
    </template>
  </form>
</template>

<script setup lang="ts">
import type { VaultDecryptKeyMaterials } from '~/composables/useVaultKey'
import { ITEM_TYPE_LABELS, type VaultItemType } from '~/types/vault'

const props = defineProps<{
  vaultId: string
  itemId?: string
}>()

const emit = defineEmits<{ saved: [] }>()

const isEdit = computed(() => Boolean(props.itemId))

const itemType = ref<VaultItemType | ''>('')
const name = ref('')
const url = ref('')
const username = ref('')
const password = ref('')
const totpSecret = ref('')
const includeMfa = ref(false)
const notes = ref('')
const recoveryCodesText = ref('')
const saving = ref(false)
const loading = ref(false)
const error = ref('')
const suppressTypeWatch = ref(false)

const { decryptVaultPayload, encryptVaultPayload } = useVaultKey()

const showUrl = computed(() =>
  itemType.value === 'login' || itemType.value === 'api_key' || itemType.value === 'ssh',
)

const showUsername = computed(() =>
  itemType.value === 'login' || itemType.value === 'ssh',
)

const showPassword = computed(() =>
  itemType.value === 'login' || itemType.value === 'api_key' || itemType.value === 'ssh',
)

const passwordLabel = computed(() => {
  if (itemType.value === 'api_key') return 'API key'
  if (itemType.value === 'ssh') return 'Private key / passphrase'
  return 'Password'
})

const showMfaToggle = computed(() => itemType.value === 'login')

const showTotpSecret = computed(() =>
  itemType.value === 'totp' || (itemType.value === 'login' && includeMfa.value),
)

const showNotes = computed(() =>
  itemType.value === 'login'
  || itemType.value === 'note'
  || itemType.value === 'ssh'
  || itemType.value === 'api_key',
)

const showRecoveryCodes = computed(() => itemType.value === 'recovery')

watch(itemType, (next, prev) => {
  if (suppressTypeWatch.value) return
  if (prev && next !== prev) {
    includeMfa.value = false
    totpSecret.value = ''
    recoveryCodesText.value = ''
  }
})

function resetForm() {
  itemType.value = ''
  name.value = ''
  url.value = ''
  username.value = ''
  password.value = ''
  totpSecret.value = ''
  includeMfa.value = false
  notes.value = ''
  recoveryCodesText.value = ''
  suppressTypeWatch.value = false
}

function applyPayload(payload: Awaited<ReturnType<typeof decryptVaultPayload>>, type: VaultItemType) {
  username.value = payload.username ?? ''
  password.value = payload.password ?? ''
  notes.value = payload.notes ?? ''
  totpSecret.value = payload.totp_secret ?? ''
  includeMfa.value = type === 'login' && Boolean(payload.totp_secret)
  recoveryCodesText.value = payload.recovery_codes?.join('\n') ?? ''
}

async function loadForEdit() {
  if (!props.itemId) return

  loading.value = true
  error.value = ''
  suppressTypeWatch.value = true
  try {
    const data = await $fetch<{
      item: {
        itemType: VaultItemType
        name: string
        url: string | null
        encryptedData: string
      }
      decryptKeys: VaultDecryptKeyMaterials
    }>(`/api/items/${props.itemId}`)

    const item = data.item
    itemType.value = item.itemType
    name.value = item.name
    url.value = item.url ?? ''

    applyPayload(await decryptVaultPayload(item.encryptedData, data.decryptKeys), item.itemType)
  }
  catch {
    error.value = 'Failed to load credential'
  }
  finally {
    suppressTypeWatch.value = false
    loading.value = false
  }
}

async function submit() {
  if (!itemType.value) return

  saving.value = true
  error.value = ''

  try {
    const recoveryCodes = recoveryCodesText.value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    const encryptedData = await encryptVaultPayload({
      username: username.value.trim() || undefined,
      password: password.value || undefined,
      totp_secret: totpSecret.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      recovery_codes: recoveryCodes.length ? recoveryCodes : undefined,
    })

    const body = {
      itemType: itemType.value,
      name: name.value.trim(),
      url: url.value.trim() || null,
      tags: [],
      encryptedData,
    }

    if (isEdit.value && props.itemId) {
      await $fetch(`/api/items/${props.itemId}`, { method: 'PUT', body })
    }
    else {
      await $fetch(`/api/vaults/${props.vaultId}/items`, { method: 'POST', body })
      resetForm()
    }

    emit('saved')
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save credential'
  }
  finally {
    saving.value = false
  }
}

watch(() => props.itemId, (id) => {
  if (id) loadForEdit()
  else resetForm()
}, { immediate: true })
</script>

<style scoped>
.item-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
  margin-bottom: 0;
  border: none;
  background: transparent;
}

.item-form h3 {
  margin: 0 0 0.25rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

label select,
label input,
label textarea {
  color: var(--text);
  background: var(--card);
  border-color: var(--border);
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
}

.checkbox-row input {
  width: auto;
}

button[type="submit"] {
  align-self: flex-start;
}

.error {
  color: var(--danger);
  margin: 0;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
