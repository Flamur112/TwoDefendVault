import { createHmac } from 'node:crypto'

/** Org-wide vault key — all team members with vault access can decrypt. */
export function deriveOrgVaultKeyMaterial(
  orgVaultKeyMaterial: string,
  orgId: string,
): string {
  return createHmac('sha256', orgVaultKeyMaterial)
    .update(`org:${orgId}`)
    .digest('hex')
}

/** Legacy per-user key — only used to read credentials encrypted before org-wide keys. */
export function deriveLegacyUserVaultKeyMaterial(
  orgVaultKeyMaterial: string,
  userId: string,
  orgId: string,
): string {
  return createHmac('sha256', orgVaultKeyMaterial)
    .update(`${orgId}:${userId}`)
    .digest('hex')
}

export interface ItemDecryptKeyMaterials {
  orgKeyMaterial: string
  viewerLegacyKeyMaterial: string
  creatorLegacyKeyMaterial: string | null
}

export function buildItemDecryptKeyMaterials(
  orgVaultKeyMaterial: string,
  orgId: string,
  viewerUserId: string,
  creatorUserId: string | null,
): ItemDecryptKeyMaterials {
  const viewerLegacyKeyMaterial = deriveLegacyUserVaultKeyMaterial(
    orgVaultKeyMaterial,
    viewerUserId,
    orgId,
  )

  return {
    orgKeyMaterial: deriveOrgVaultKeyMaterial(orgVaultKeyMaterial, orgId),
    viewerLegacyKeyMaterial,
    creatorLegacyKeyMaterial: creatorUserId
      ? deriveLegacyUserVaultKeyMaterial(orgVaultKeyMaterial, creatorUserId, orgId)
      : null,
  }
}

/** @deprecated Use deriveOrgVaultKeyMaterial */
export function deriveUserVaultKeyMaterial(
  orgVaultKeyMaterial: string,
  userId: string,
  orgId: string,
): string {
  return deriveLegacyUserVaultKeyMaterial(orgVaultKeyMaterial, userId, orgId)
}
