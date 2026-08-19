import { requireAuth } from '../utils/authorize'
import { buildItemDecryptKeyMaterials } from '../utils/vault-key'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const config = useRuntimeConfig()

  if (!config.vaultKeyMaterial) {
    throw createError({ statusCode: 503, statusMessage: 'Vault key material not configured' })
  }

  const keys = buildItemDecryptKeyMaterials(
    config.vaultKeyMaterial,
    user.orgId,
    user.id,
    null,
  )

  return {
    orgKeyMaterial: keys.orgKeyMaterial,
    viewerLegacyKeyMaterial: keys.viewerLegacyKeyMaterial,
    creatorLegacyKeyMaterial: keys.creatorLegacyKeyMaterial,
    // Back-compat for older clients
    keyMaterial: keys.orgKeyMaterial,
    legacyKeyMaterial: keys.viewerLegacyKeyMaterial,
  }
})
