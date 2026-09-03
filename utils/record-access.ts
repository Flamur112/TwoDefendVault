export type RecordVisibility = 'all' | 'members' | 'admin' | 'restricted'

export const RECORD_VISIBILITY_KEY = 'visibility'
export const RECORD_ALLOWED_USERS_KEY = 'allowedUsers'

export interface RecordAllowedUser {
  id: string
  name: string
}

export const RECORD_VISIBILITY_OPTIONS: ReadonlyArray<{
  value: RecordVisibility
  label: string
  description: string
}> = [
  {
    value: 'all',
    label: 'Everyone',
    description: 'Visible to all users, including read-only',
  },
  {
    value: 'members',
    label: 'Members & admins',
    description: 'Hidden from read-only users',
  },
  {
    value: 'admin',
    label: 'Admins only',
    description: 'Sensitive — only administrators can view',
  },
  {
    value: 'restricted',
    label: 'Specific people',
    description: 'Only selected team members and admins',
  },
]

export function parseRecordVisibility(
  metadata: Record<string, string> | Record<string, unknown> | null | undefined,
): RecordVisibility {
  const raw = metadata && typeof metadata === 'object'
    ? (metadata as Record<string, unknown>)[RECORD_VISIBILITY_KEY]
    : undefined

  if (raw === 'admin' || raw === 'members' || raw === 'all' || raw === 'restricted') {
    return raw
  }

  return 'all'
}

export function parseAllowedUsers(
  metadata: Record<string, string> | Record<string, unknown> | null | undefined,
): RecordAllowedUser[] {
  const raw = metadata && typeof metadata === 'object'
    ? (metadata as Record<string, unknown>)[RECORD_ALLOWED_USERS_KEY]
    : undefined

  if (typeof raw === 'string') {
    try {
      return normalizeAllowedUsers(JSON.parse(raw))
    }
    catch {
      return []
    }
  }

  if (Array.isArray(raw)) {
    return normalizeAllowedUsers(raw)
  }

  return []
}

function normalizeAllowedUsers(parsed: unknown): RecordAllowedUser[] {
  if (!Array.isArray(parsed)) return []

  return parsed.filter((entry): entry is RecordAllowedUser =>
    !!entry
    && typeof entry === 'object'
    && typeof (entry as RecordAllowedUser).id === 'string'
    && typeof (entry as RecordAllowedUser).name === 'string',
  )
}

export function serializeAllowedUsers(users: RecordAllowedUser[]): string {
  return JSON.stringify(users.slice(0, 50))
}

export function visibilityLabel(
  visibility: RecordVisibility,
  metadata?: Record<string, string> | Record<string, unknown> | null,
): string {
  if (visibility === 'restricted') {
    const count = metadata ? parseAllowedUsers(metadata).length : 0
    return count > 0 ? `${count} selected` : 'Specific people'
  }
  return RECORD_VISIBILITY_OPTIONS.find(option => option.value === visibility)?.label ?? 'Everyone'
}

export function canViewRecord(
  user: { id: string, role: string },
  metadata: Record<string, string> | Record<string, unknown> | null | undefined,
): boolean {
  if (user.role === 'admin') return true

  const visibility = parseRecordVisibility(metadata)
  if (visibility === 'admin') return false
  if (visibility === 'members') return user.role === 'member'
  if (visibility === 'restricted') {
    return parseAllowedUsers(metadata).some(entry => entry.id === user.id)
  }
  return true
}

export function canSetRecordVisibility(user: { role: string }): boolean {
  return user.role === 'admin'
}

export function requireRecordView(
  user: { id: string, role: string },
  metadata: Record<string, string> | Record<string, unknown> | null | undefined,
): void {
  if (!canViewRecord(user, metadata)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this item' })
  }
}

export function applyRecordAccess(
  metadata: Record<string, string>,
  visibility: RecordVisibility | undefined,
  allowedUsers: RecordAllowedUser[] | undefined,
  user: { role: string },
): Record<string, string> {
  const next = { ...metadata }

  if (!canSetRecordVisibility(user)) {
    return next
  }

  const resolvedVisibility = visibility ?? parseRecordVisibility(next)
  const resolvedUsers = allowedUsers ?? parseAllowedUsers(next)

  if (!visibility && !allowedUsers) {
    return next
  }

  if (!resolvedVisibility || resolvedVisibility === 'all') {
    delete next[RECORD_VISIBILITY_KEY]
    delete next[RECORD_ALLOWED_USERS_KEY]
    return next
  }

  next[RECORD_VISIBILITY_KEY] = resolvedVisibility

  if (resolvedVisibility === 'restricted') {
    if (resolvedUsers.length > 0) {
      next[RECORD_ALLOWED_USERS_KEY] = serializeAllowedUsers(resolvedUsers)
    }
    else {
      delete next[RECORD_ALLOWED_USERS_KEY]
    }
  }
  else {
    delete next[RECORD_ALLOWED_USERS_KEY]
  }

  return next
}

/** @deprecated use applyRecordAccess */
export function applyRecordVisibility(
  metadata: Record<string, string>,
  visibility: RecordVisibility | undefined,
  user: { role: string },
): Record<string, string> {
  return applyRecordAccess(metadata, visibility, undefined, user)
}

export function allowedUserIdsFromMetadata(
  metadata: Record<string, string> | Record<string, unknown> | null | undefined,
): string[] {
  return parseAllowedUsers(metadata).map(user => user.id)
}

export function filterVisibleRecords<T extends { metadata: Record<string, string> }>(
  user: { id: string, role: string },
  records: T[],
): T[] {
  return records.filter(record => canViewRecord(user, record.metadata))
}
