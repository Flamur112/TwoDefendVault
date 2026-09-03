import { ORG_LICENSES_LIMIT } from './api-limits'
import type { SessionUser } from './session'
import { canViewRecord } from '../../utils/record-access'
import { getLicenseExpiryInfo, type LicenseExpiryStatus } from '../../utils/license-expiry'
import { getSupabaseAdmin } from './supabase'
import type { OrgLicenseRow } from '../../types/licenses'

export type { OrgLicenseRow } from '../../types/licenses'

export async function listOrgLicenses(
  user: SessionUser,
  options?: { mode?: 'attention' | 'all', expiringWithinDays?: number },
): Promise<OrgLicenseRow[]> {
  const mode = options?.mode ?? 'attention'
  const ahead = options?.expiringWithinDays ?? 30

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .select(`
      id,
      client_id,
      title,
      metadata,
      clients!inner(name, org_id)
    `)
    .eq('section', 'licenses')
    .eq('clients.org_id', user.orgId)
    .order('title')
    .limit(ORG_LICENSES_LIMIT + 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load licenses' })
  }

  const rows: OrgLicenseRow[] = []
  const sourceRows = (data ?? []).slice(0, ORG_LICENSES_LIMIT)

  for (const row of sourceRows) {
    const metadata = (row.metadata ?? {}) as Record<string, string>
    if (!canViewRecord(user, metadata)) continue

    const expiresAt = metadata.expiresAt?.trim() || null
    const expiry = getLicenseExpiryInfo(expiresAt ?? undefined)

    if (mode === 'attention') {
      if (expiry.status === 'none') continue
      if (expiry.status === 'ok' && expiry.daysRemaining !== null && expiry.daysRemaining > ahead) {
        continue
      }
    }

    const client = row.clients as { name?: string } | null

    rows.push({
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name ?? 'Client',
      title: row.title,
      vendor: metadata.vendor?.trim() || null,
      expiresAt,
      expiryStatus: expiry.status,
      expiryLabel: expiry.label || 'No expiry date',
      daysRemaining: expiry.daysRemaining,
      href: `/clients/${row.client_id}/licenses`,
    })
  }

  rows.sort((a, b) => {
    const rank = (status: LicenseExpiryStatus) => {
      if (status === 'expired') return 0
      if (status === 'soon') return 1
      if (status === 'ok') return 2
      return 3
    }
    const rankDiff = rank(a.expiryStatus) - rank(b.expiryStatus)
    if (rankDiff !== 0) return rankDiff
    if (a.daysRemaining !== null && b.daysRemaining !== null) {
      return a.daysRemaining - b.daysRemaining
    }
    return a.title.localeCompare(b.title)
  })

  return rows
}

export async function listClientLicenseSummary(
  user: SessionUser,
  clientId: string,
): Promise<{ expiringCount: number, expiredCount: number, attention: OrgLicenseRow[] }> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('client_records')
    .select(`
      id,
      client_id,
      title,
      metadata,
      clients!inner(name, org_id)
    `)
    .eq('client_id', clientId)
    .eq('section', 'licenses')
    .eq('clients.org_id', user.orgId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load licenses' })
  }

  const attention: OrgLicenseRow[] = []
  let expiringCount = 0
  let expiredCount = 0

  for (const row of data ?? []) {
    const metadata = (row.metadata ?? {}) as Record<string, string>
    if (!canViewRecord(user, metadata)) continue

    const expiresAt = metadata.expiresAt?.trim() || null
    const expiry = getLicenseExpiryInfo(expiresAt ?? undefined)
    if (expiry.status === 'none' || expiry.status === 'ok') continue

    if (expiry.status === 'expired') expiredCount += 1
    if (expiry.status === 'soon') expiringCount += 1

    const client = row.clients as { name?: string } | null
    attention.push({
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name ?? 'Client',
      title: row.title,
      vendor: metadata.vendor?.trim() || null,
      expiresAt,
      expiryStatus: expiry.status,
      expiryLabel: expiry.label,
      daysRemaining: expiry.daysRemaining,
      href: `/clients/${row.client_id}/licenses`,
    })
  }

  attention.sort((a, b) => {
    if (a.expiryStatus === 'expired' && b.expiryStatus !== 'expired') return -1
    if (b.expiryStatus === 'expired' && a.expiryStatus !== 'expired') return 1
    if (a.daysRemaining !== null && b.daysRemaining !== null) {
      return a.daysRemaining - b.daysRemaining
    }
    return a.title.localeCompare(b.title)
  })

  return {
    expiringCount,
    expiredCount,
    attention: attention.slice(0, 5),
  }
}
