import { createHmac } from 'node:crypto'

/** HMAC-derived key material scoped to org + user (never expose raw VAULT_KEY_MATERIAL). */
export function deriveUserVaultKeyMaterial(
  orgVaultKeyMaterial: string,
  userId: string,
  orgId: string,
): string {
  return createHmac('sha256', orgVaultKeyMaterial)
    .update(`${orgId}:${userId}`)
    .digest('hex')
}
