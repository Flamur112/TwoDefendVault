import { deriveKey, hexToArrayBuffer } from '~/utils/crypto'

/** In-memory only — never persisted to localStorage or sessionStorage. */
const vaultKey = shallowRef<CryptoKey | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useVaultKey() {
  async function loadKey(): Promise<CryptoKey> {
    if (vaultKey.value) {
      return vaultKey.value
    }

    loading.value = true
    error.value = null

    try {
      const { keyMaterial } = await $fetch<{ keyMaterial: string }>('/api/vault-key')
      const material = hexToArrayBuffer(keyMaterial)
      vaultKey.value = await deriveKey(material)
      return vaultKey.value
    }
    catch {
      error.value = 'Failed to load vault encryption key'
      throw createError({ statusCode: 500, statusMessage: 'Failed to load vault encryption key' })
    }
    finally {
      loading.value = false
    }
  }

  function clearKey(): void {
    vaultKey.value = null
    error.value = null
  }

  return {
    key: readonly(vaultKey),
    loading: readonly(loading),
    error: readonly(error),
    loadKey,
    clearKey,
  }
}
