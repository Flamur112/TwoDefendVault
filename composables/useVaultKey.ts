import {
  decryptPayload,
  deriveKey,
  encryptPayload,
  hexToArrayBuffer,
  normalizeEncryptedData,
} from '~/utils/crypto'

export interface VaultDecryptKeyMaterials {
  orgKeyMaterial: string
  viewerLegacyKeyMaterial: string
  creatorLegacyKeyMaterial?: string | null
}

/** In-memory only — never persisted to localStorage or sessionStorage. */
const vaultKey = shallowRef<CryptoKey | null>(null)
const derivedKeyCache = new Map<string, CryptoKey>()
const loading = ref(false)
const error = ref<string | null>(null)

async function deriveCachedKey(materialHex: string): Promise<CryptoKey> {
  const cached = derivedKeyCache.get(materialHex)
  if (cached) return cached
  const key = await deriveKey(hexToArrayBuffer(materialHex))
  derivedKeyCache.set(materialHex, key)
  return key
}

async function keysFromMaterials(materials: VaultDecryptKeyMaterials): Promise<CryptoKey[]> {
  const keys: CryptoKey[] = []
  keys.push(await deriveCachedKey(materials.orgKeyMaterial))
  keys.push(await deriveCachedKey(materials.viewerLegacyKeyMaterial))

  if (
    materials.creatorLegacyKeyMaterial
    && materials.creatorLegacyKeyMaterial !== materials.viewerLegacyKeyMaterial
  ) {
    keys.push(await deriveCachedKey(materials.creatorLegacyKeyMaterial))
  }

  return keys
}

export function useVaultKey() {
  async function fetchDecryptMaterials(): Promise<VaultDecryptKeyMaterials> {
    const data = await $fetch<VaultDecryptKeyMaterials & {
      keyMaterial?: string
      legacyKeyMaterial?: string
    }>('/api/vault-key')

    return {
      orgKeyMaterial: data.orgKeyMaterial ?? data.keyMaterial!,
      viewerLegacyKeyMaterial: data.viewerLegacyKeyMaterial ?? data.legacyKeyMaterial!,
      creatorLegacyKeyMaterial: data.creatorLegacyKeyMaterial ?? null,
    }
  }

  async function loadKey(): Promise<CryptoKey> {
    if (vaultKey.value) return vaultKey.value

    loading.value = true
    error.value = null

    try {
      const materials = await fetchDecryptMaterials()
      vaultKey.value = await deriveCachedKey(materials.orgKeyMaterial)
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

  async function decryptVaultPayload(
    encryptedData: unknown,
    decryptKeys?: VaultDecryptKeyMaterials,
  ) {
    const materials = decryptKeys ?? await fetchDecryptMaterials()
    const keys = await keysFromMaterials(materials)
    const normalized = normalizeEncryptedData(encryptedData)

    let lastError: unknown
    for (const key of keys) {
      try {
        return await decryptPayload(key, normalized)
      }
      catch (err) {
        lastError = err
      }
    }

    throw lastError ?? new Error('Decryption failed')
  }

  async function encryptVaultPayload(payload: Parameters<typeof encryptPayload>[1]) {
    const key = await loadKey()
    return encryptPayload(key, payload)
  }

  function clearKey(): void {
    vaultKey.value = null
    derivedKeyCache.clear()
    error.value = null
  }

  return {
    key: readonly(vaultKey),
    loading: readonly(loading),
    error: readonly(error),
    loadKey,
    decryptVaultPayload,
    encryptVaultPayload,
    clearKey,
  }
}
