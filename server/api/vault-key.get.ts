import { requireAuth } from '../utils/authorize'
import { deriveUserVaultKeyMaterial } from '../utils/vault-key'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const config = useRuntimeConfig()

  if (!config.vaultKeyMaterial) {
    throw createError({ statusCode: 503, statusMessage: 'Vault key material not configured' })
  }

  const keyMaterial = deriveUserVaultKeyMaterial(
    config.vaultKeyMaterial,
    user.id,
    user.orgId,
  )

  return { keyMaterial }
})
