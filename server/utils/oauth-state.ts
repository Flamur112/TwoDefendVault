import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const DEFAULT_MAX_AGE_MS = 600_000 // 10 minutes

export function createSignedOAuthState(secret: string): string {
  const nonce = randomBytes(32).toString('base64url')
  const issuedAt = Date.now().toString(36)
  const payload = `${nonce}.${issuedAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifySignedOAuthState(
  state: string,
  secret: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
): boolean {
  const parts = state.split('.')
  if (parts.length !== 3) return false

  const [nonce, issuedAt, signature] = parts
  if (!nonce || !issuedAt || !signature) return false

  const payload = `${nonce}.${issuedAt}`
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')

  try {
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false
  }
  catch {
    return false
  }

  const issuedMs = Number.parseInt(issuedAt, 36)
  if (Number.isNaN(issuedMs)) return false

  const age = Date.now() - issuedMs
  return age >= 0 && age <= maxAgeMs
}
