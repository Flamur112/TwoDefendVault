import { isClientSection } from '../../utils/client-sections'

export function parseSectionParam(value: string | undefined): string {
  if (!value || !isClientSection(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid section' })
  }
  return value
}

export function mapClientRecord(row: {
  id: string
  client_id: string
  section: string
  title: string
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}) {
  const metadata: Record<string, string> = {}
  if (row.metadata && typeof row.metadata === 'object') {
    for (const [key, val] of Object.entries(row.metadata)) {
      if (typeof val === 'string') metadata[key] = val
      else if (val != null) metadata[key] = String(val)
    }
  }

  return {
    id: row.id,
    clientId: row.client_id,
    section: row.section,
    title: row.title,
    notes: row.notes,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapOrgSectionRecord(row: {
  id: string
  client_id: string
  section: string
  title: string
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  clients: { name: string, slug: string } | { name: string, slug: string }[] | null
}) {
  const client = Array.isArray(row.clients) ? row.clients[0] : row.clients
  const base = mapClientRecord(row)
  return {
    ...base,
    clientName: client?.name ?? 'Unknown client',
    clientSlug: client?.slug ?? '',
  }
}

export function normalizeMetadata(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }

  const metadata: Record<string, string> = {}
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (typeof val !== 'string') continue
    const trimmed = val.trim()
    if (trimmed) metadata[key] = trimmed
  }
  return metadata
}
