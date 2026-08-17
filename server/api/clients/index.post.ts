import { requireAuth } from '../../utils/authorize'
import { mapClient } from '../../utils/client-map'
import { getSupabaseAdmin } from '../../utils/supabase'
import { canEditClients, logClientActivity, slugifyClientName, uniqueClientSlug } from '../../utils/clients'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!canEditClients(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Client name is required' })
  }

  const baseSlug = slugifyClientName(name)
  const slug = await uniqueClientSlug(user.orgId, baseSlug)

  const supabase = getSupabaseAdmin()
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      org_id: user.orgId,
      name,
      slug,
      industry: body?.industry ?? null,
      website: body?.website ?? null,
      phone: body?.phone ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error || !client) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create client' })
  }

  await logClientActivity(client.id, user.id, 'created', { name })

  return { client: mapClient(client) }
})
