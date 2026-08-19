const ALGORITHM = { name: 'AES-GCM', length: 256 } as const

export interface VaultItemPayload {
  username?: string
  password?: string
  totp_secret?: string
  notes?: string
  recovery_codes?: string[]
  custom_fields?: Array<{ key: string, value: string }>
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex key material')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes.buffer
}

export function normalizeEncryptedData(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('Missing encrypted payload')
    return trimmed
  }
  throw new Error('Missing encrypted payload')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function deriveKey(keyMaterial: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', keyMaterial, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('vault-v1') },
    baseKey,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return bytesToBase64(combined)
}

export async function decrypt(key: CryptoKey, b64: string): Promise<string> {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}

export async function encryptPayload(key: CryptoKey, payload: VaultItemPayload): Promise<string> {
  return encrypt(key, JSON.stringify(payload))
}

export async function decryptPayload(key: CryptoKey, b64: string): Promise<VaultItemPayload> {
  return JSON.parse(await decrypt(key, normalizeEncryptedData(b64))) as VaultItemPayload
}

export async function decryptPayloadWithFallback(
  primaryKey: CryptoKey,
  b64: string,
  legacyKey?: CryptoKey | null,
): Promise<VaultItemPayload> {
  const normalized = normalizeEncryptedData(b64)
  try {
    return await decryptPayload(primaryKey, normalized)
  }
  catch (primaryError) {
    if (!legacyKey) throw primaryError
    return await decryptPayload(legacyKey, normalized)
  }
}
