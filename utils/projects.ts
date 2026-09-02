import type { ClientSectionRecord } from '~/types/client'

export const PROJECT_STATUSES = [
  'Open',
  'In progress',
  'On hold',
  'Blocked',
  'Completed',
] as const

export type ProjectStatus = typeof PROJECT_STATUSES[number]

export interface ProjectAssignee {
  id: string
  name: string
}

export interface ProjectUpdate {
  id: string
  userId: string
  userName: string
  text: string
  status?: string
  createdAt: string
  updatedAt?: string
}

export interface ProjectTimeline {
  percent: number
  label: string
  tone: 'ok' | 'warning' | 'overdue' | 'done' | 'none'
}

export interface ProjectViewModel<TRecord extends ClientSectionRecord = ClientSectionRecord> {
  record: TRecord
  status: string
  assignees: ProjectAssignee[]
  updates: ProjectUpdate[]
  latestUpdate: ProjectUpdate | null
  timeline: ProjectTimeline | null
}

export const PROJECT_ASSIGNEES_KEY = 'assignees'
export const PROJECT_UPDATES_KEY = 'projectUpdates'

const DAY_MS = 86_400_000

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value)
}

export function projectStatusClass(status: string | undefined): string {
  switch (status) {
    case 'Open': return 'status-open'
    case 'In progress': return 'status-progress'
    case 'On hold': return 'status-hold'
    case 'Blocked': return 'status-blocked'
    case 'Completed': return 'status-done'
    default: return 'status-default'
  }
}

export function parseAssignees(metadata: Record<string, string>): ProjectAssignee[] {
  const raw = metadata[PROJECT_ASSIGNEES_KEY]
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry): entry is ProjectAssignee =>
            !!entry
            && typeof entry === 'object'
            && typeof (entry as ProjectAssignee).id === 'string'
            && typeof (entry as ProjectAssignee).name === 'string',
          )
      }
    }
    catch {
      // fall through to legacy format
    }
  }

  const legacyId = metadata.assigneeUserId
  if (legacyId) {
    const legacyName = metadata.assigneeName || legacyId
    return [{ id: legacyId, name: legacyName }]
  }

  return []
}

export function serializeAssignees(assignees: ProjectAssignee[]): string {
  return JSON.stringify(assignees)
}

export function parseProjectUpdates(metadata: Record<string, string>): ProjectUpdate[] {
  const raw = metadata[PROJECT_UPDATES_KEY]
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry): entry is ProjectUpdate =>
        !!entry
        && typeof entry === 'object'
        && typeof (entry as ProjectUpdate).id === 'string'
        && typeof (entry as ProjectUpdate).userId === 'string'
        && typeof (entry as ProjectUpdate).userName === 'string'
        && typeof (entry as ProjectUpdate).text === 'string'
        && typeof (entry as ProjectUpdate).createdAt === 'string',
      )
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
        return bTime - aTime
      })
  }
  catch {
    return []
  }
}

export function serializeProjectUpdates(updates: ProjectUpdate[]): string {
  return JSON.stringify(updates.slice(0, 100))
}

export function getProjectStatus(metadata: Record<string, string>): string {
  return metadata.status || 'Open'
}

function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const ms = Date.UTC(year, month, day)
  return Number.isNaN(ms) ? null : ms
}

function startOfTodayUtc(): number {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

export function getProjectTimeline(record: ClientSectionRecord): ProjectTimeline | null {
  const status = getProjectStatus(record.metadata)
  const endMs = record.metadata.endDate ? parseDateOnly(record.metadata.endDate) : null
  if (endMs === null) return null

  if (status === 'Completed') {
    return { percent: 100, label: 'Completed', tone: 'done' }
  }

  const today = startOfTodayUtc()

  if (today > endMs) {
    return { percent: 100, label: 'Due date passed', tone: 'ok' }
  }

  const startMs = record.metadata.startDate
    ? parseDateOnly(record.metadata.startDate)
    : parseDateOnly(record.createdAt.slice(0, 10))

  if (startMs === null || endMs <= startMs) {
    const daysLeft = Math.ceil((endMs - today) / DAY_MS)
    return {
      percent: 0,
      label: daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`,
      tone: daysLeft <= 3 ? 'warning' : 'ok',
    }
  }

  const total = endMs - startMs
  const elapsed = Math.min(Math.max(today - startMs, 0), total)
  const percent = Math.round((elapsed / total) * 100)

  const daysLeft = Math.ceil((endMs - today) / DAY_MS)
  let label = `${daysLeft} days left`
  if (daysLeft === 0) label = 'Due today'
  else if (daysLeft === 1) label = '1 day left'

  let tone: ProjectTimeline['tone'] = 'ok'
  if (daysLeft <= 3) tone = 'warning'
  if (percent >= 85) tone = 'warning'

  return { percent, label, tone }
}

export function buildProjectViewModel<TRecord extends ClientSectionRecord>(
  record: TRecord,
): ProjectViewModel<TRecord> {
  const updates = parseProjectUpdates(record.metadata)
  return {
    record,
    status: getProjectStatus(record.metadata),
    assignees: parseAssignees(record.metadata),
    updates,
    latestUpdate: updates[0] ?? null,
    timeline: getProjectTimeline(record),
  }
}

export function formatProjectWhen(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatProjectTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatUpdateTimestamp(entry: ProjectUpdate): string {
  const stamp = entry.updatedAt ?? entry.createdAt
  const relative = formatProjectWhen(stamp)
  const exact = formatProjectTimestamp(stamp)
  const edited = entry.updatedAt && entry.updatedAt !== entry.createdAt
  return edited ? `${relative} (edited · ${exact})` : `${relative} · ${exact}`
}

export function assigneeLabels(assignees: ProjectAssignee[]): string {
  if (assignees.length === 0) return 'Unassigned'
  return assignees.map(a => a.name).join(', ')
}

export function metadataFromRow(metadata: Record<string, unknown> | null): Record<string, string> {
  const result: Record<string, string> = {}
  if (!metadata || typeof metadata !== 'object') return result

  for (const [key, val] of Object.entries(metadata)) {
    if (key === PROJECT_UPDATES_KEY || key === PROJECT_ASSIGNEES_KEY) {
      const serialized = serializeJsonMetadataField(val)
      if (serialized) result[key] = serialized
      continue
    }

    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed) result[key] = trimmed
    }
    else if (typeof val === 'number' || typeof val === 'boolean') {
      result[key] = String(val)
    }
  }

  return result
}

function serializeJsonMetadataField(val: unknown): string | null {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed || null
  }
  if (Array.isArray(val) || (val && typeof val === 'object')) {
    try {
      return JSON.stringify(val)
    }
    catch {
      return null
    }
  }
  return null
}
