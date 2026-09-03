import {
  applyRecordAccess,
  type RecordVisibility,
} from '../../utils/record-access'
import { resolveAllowedUsers } from './record-access-users'

function parseVisibility(raw: unknown): RecordVisibility | undefined {
  if (raw === 'admin' || raw === 'members' || raw === 'all' || raw === 'restricted') {
    return raw
  }
  return undefined
}

function parseAllowedUserIds(body: unknown): string[] | undefined {
  if (!body || typeof body !== 'object') return undefined
  const ids = (body as { allowedUserIds?: unknown }).allowedUserIds
  if (!Array.isArray(ids)) return undefined
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export async function applyRecordAccessFromBody(
  orgId: string,
  user: { role: string },
  body: unknown,
  baseMetadata: Record<string, string>,
): Promise<Record<string, string>> {
  const visibility = body && typeof body === 'object'
    ? parseVisibility((body as { visibility?: unknown }).visibility)
    : undefined

  const allowedUserIds = parseAllowedUserIds(body)
  const allowedUsers = allowedUserIds !== undefined
    ? await resolveAllowedUsers(orgId, allowedUserIds)
    : undefined

  return applyRecordAccess(baseMetadata, visibility, allowedUsers, user)
}

export async function mergeRecordAccessFromBody(
  orgId: string,
  user: { role: string },
  body: unknown,
  existingMetadata: Record<string, string>,
  nextMetadata: Record<string, string> | null,
): Promise<Record<string, string> | null> {
  const hasVisibility = body && typeof body === 'object'
    && typeof (body as { visibility?: unknown }).visibility === 'string'
  const hasAllowedUsers = body && typeof body === 'object'
    && Array.isArray((body as { allowedUserIds?: unknown }).allowedUserIds)

  if (!hasVisibility && !hasAllowedUsers && !nextMetadata) {
    return null
  }

  const base = nextMetadata ?? existingMetadata
  return applyRecordAccessFromBody(orgId, user, body, base)
}
