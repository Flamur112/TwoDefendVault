<template>
  <form class="item-form" @submit.prevent="submit">
    <h3>Add credential</h3>

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
      {{ saving ? 'Saving…' : 'Save credential' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { encryptPayload } from '~/utils/crypto'
import { ITEM_TYPE_LABELS, type VaultItemType } from '~/types/vault'

const props = defineProps<{ vaultId: string }>()
const emit = defineEmits<{ saved: [] }>()

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
const error = ref('')

const { loadKey } = useVaultKey()

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

watch(itemType, () => {
  includeMfa.value = false
  totpSecret.value = ''
  recoveryCodesText.value = ''
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

    const key = await loadKey()
    const encryptedData = await encryptPayload(key, {
      username: username.value.trim() || undefined,
      password: password.value || undefined,
      totp_secret: totpSecret.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      recovery_codes: recoveryCodes.length ? recoveryCodes : undefined,
    })

    await $fetch(`/api/vaults/${props.vaultId}/items`, {
      method: 'POST',
      body: {
        itemType: itemType.value,
        name: name.value.trim(),
        url: url.value.trim() || null,
        tags: [],
        encryptedData,
      },
    })

    resetForm()
    emit('saved')
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save credential'
  }
  finally {
    saving.value = false
  }
}
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
