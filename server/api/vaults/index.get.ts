import { requireAuth, getAccessibleVaults } from '../../utils/authorize'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const vaults = await getAccessibleVaults(user)

  return {
    vaults: vaults.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      clientId: v.client_id ?? null,
      createdAt: v.created_at,
    })),
  }
})
