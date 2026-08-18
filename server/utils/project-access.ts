import type { SessionUser } from './session'
import { metadataFromRow, parseAssignees } from '../../utils/projects'

type ProjectUser = Pick<SessionUser, 'id' | 'role'>

export function canViewProject(
  user: ProjectUser,
  metadata: Record<string, unknown> | null,
): boolean {
  if (user.role === 'admin') return true
  const assignees = parseAssignees(metadataFromRow(metadata))
  return assignees.some(assignee => assignee.id === user.id)
}

export function canEditProject(
  user: ProjectUser,
  metadata: Record<string, unknown> | null,
): boolean {
  if (user.role === 'readonly') return false
  if (user.role === 'admin') return true
  if (user.role !== 'member') return false
  return canViewProject(user, metadata)
}

export function requireProjectView(
  user: ProjectUser,
  metadata: Record<string, unknown> | null,
): void {
  if (!canViewProject(user, metadata)) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned to this project' })
  }
}

export function requireProjectEdit(
  user: ProjectUser,
  metadata: Record<string, unknown> | null,
): void {
  if (!canEditProject(user, metadata)) {
    throw createError({ statusCode: 403, statusMessage: 'You are not authorized to edit this project' })
  }
}

export function filterVisibleProjects<T extends { metadata: Record<string, unknown> | null }>(
  user: ProjectUser,
  records: T[],
): T[] {
  if (user.role === 'admin') return records
  return records.filter(record => canViewProject(user, record.metadata))
}
