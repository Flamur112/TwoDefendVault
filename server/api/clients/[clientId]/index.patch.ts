import { mapClient, requireClientInOrg } from '../../../utils/client-map'
import { getSupabaseAdmin } from '../../../utils/supabase'
import { canEditClients, logClientActivity } from '../../../utils/clients'
import { isClientFavorite, setClientFavorite } from '../../../utils/client-favorites'

export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'clientId')
  if (!clientId) throw createError({ statusCode: 400, statusMessage: 'Client ID required' })

  const { user, client } = await requireClientInOrg(event, clientId)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const stringFields = [
    'name', 'industry', 'website', 'phone', 'address', 'city',
    'state', 'country', 'postal_code', 'notes', 'logo_url',
  ] as const

  for (const field of stringFields) {
    const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if (body?.[camel] !== undefined || body?.[field] !== undefined) {
      const val = body[camel] ?? body[field]
      updates[field] = typeof val === 'string' ? val.trim() || null : null
    }
  }

  if (body?.onboardedAt !== undefined) {
    updates.onboarded_at = body.onboardedAt || null
  }

  let favoriteChanged = false
  if (body?.isFavorite !== undefined) {
    const wantFavorite = Boolean(body.isFavorite)
    const currentlyFavorite = await isClientFavorite(user.id, clientId)
    if (wantFavorite !== currentlyFavorite) {
      await setClientFavorite(user.id, clientId, wantFavorite)
      favoriteChanged = true
    }
  }

  const supabase = getSupabaseAdmin()
  const changedFields = Object.keys(updates).filter(k => k !== 'updated_at')

  let updated = client
  if (changedFields.length > 0) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select('*')
      .single()

    if (error || !data) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to update client' })
    }
    updated = data
  }

  if (favoriteChanged || changedFields.length > 0) {
    const action = favoriteChanged && changedFields.length === 0 ? 'favorite_toggled' : 'edited'
    await logClientActivity(clientId, user.id, action, {
      fields: favoriteChanged ? [...changedFields, 'favorite'] : changedFields,
    })
  }

  const isFavorite = await isClientFavorite(user.id, clientId)
  return { client: mapClient(updated, { isFavorite }) }
})
