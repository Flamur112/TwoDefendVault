import type { H3Event } from 'h3'
import { requireAuth } from './authorize'
import { getSupabaseAdmin } from './supabase'

export interface ClientRecord {
  id: string
  orgId: string
  name: string
  slug: string
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  notes: string | null
  logoUrl: string | null
  onboardedAt: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export const CLIENT_LIST_COLUMNS = 'id, org_id, name, slug, industry, website, phone, address, city, state, country, postal_code, notes, logo_url, onboarded_at, is_favorite, created_at, updated_at'

export function mapClient(
  row: Record<string, unknown>,
  options?: { isFavorite?: boolean },
): ClientRecord {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    slug: row.slug as string,
    industry: (row.industry as string) ?? null,
    website: (row.website as string) ?? null,
    phone: (row.phone as string) ?? null,
    address: (row.address as string) ?? null,
    city: (row.city as string) ?? null,
    state: (row.state as string) ?? null,
    country: (row.country as string) ?? null,
    postalCode: (row.postal_code as string) ?? null,
    notes: (row.notes as string) ?? null,
    logoUrl: (row.logo_url as string) ?? null,
    onboardedAt: (row.onboarded_at as string) ?? null,
    isFavorite: options?.isFavorite ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function requireClientInOrg(event: H3Event, clientId: string) {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdmin()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle()

  if (!client || client.org_id !== user.orgId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return { user, client }
}
