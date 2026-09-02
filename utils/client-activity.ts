import type { ClientActivityEntry } from '~/types/client'
import { ACTIVITY_RETENTION_DAYS } from '~/utils/retention'

export const ACTIVITY_DEFAULT_LIMIT = 50
export const ACTIVITY_PREVIEW_LIMIT = 10

export type ActivityFilter = 'all' | 'credentials' | 'documents'

const CREDENTIAL_ACTIONS = new Set(['credential_added', 'vault_added', 'vault_deleted'])

export function matchesActivityFilter(action: string, filter: ActivityFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'credentials') return CREDENTIAL_ACTIONS.has(action)
  if (filter === 'documents') return action.startsWith('documents_')
  return true
}


export function getClientActivityDetail(
  action: string,
  metadata: Record<string, unknown> | null,
): string | null {
  const itemName = typeof metadata?.itemName === 'string' ? metadata.itemName : ''
  const vaultName = typeof metadata?.vaultName === 'string' ? metadata.vaultName : ''
  const title = typeof metadata?.title === 'string' ? metadata.title : ''
  const name = typeof metadata?.name === 'string' ? metadata.name : ''

  if (itemName) return itemName
  if (vaultName) return vaultName
  if (title) return title
  if (name) return name

  if (action.endsWith('_added') || action.endsWith('_updated') || action.endsWith('_deleted')) {
    return null
  }

  return null
}

export function getClientActivityActionLabel(action: string): string {
  switch (action) {
    case 'created':
      return 'Created client'
    case 'edited':
      return 'Edited client details'
    case 'favorite_toggled':
      return 'Updated favorite status'
    case 'vault_added':
      return 'Added vault'
    case 'vault_deleted':
      return 'Deleted vault'
    case 'credential_added':
      return 'Added credential'
    case 'documents_added':
      return 'Created document'
    case 'documents_updated':
      return 'Edited document'
    case 'documents_deleted':
      return 'Deleted document'
    case 'documents_viewed':
      return 'Viewed document'
    case 'projects_updated':
      return 'Updated project'
    default: {
      if (action.endsWith('_added')) {
        return `Added ${action.replace(/_added$/, '').replace(/_/g, ' ')}`
      }
      if (action.endsWith('_updated')) {
        return `Updated ${action.replace(/_updated$/, '').replace(/_/g, ' ')}`
      }
      if (action.endsWith('_deleted')) {
        return `Deleted ${action.replace(/_deleted$/, '').replace(/_/g, ' ')}`
      }
      return action.replace(/_/g, ' ')
    }
  }
}

export function formatClientActivityAction(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const label = getClientActivityActionLabel(action)
  const detail = getClientActivityDetail(action, metadata)
  return detail ? `${label}: ${detail}` : label
}

export function formatClientActivityEntry(entry: ClientActivityEntry): string {
  return formatClientActivityAction(entry.action, entry.metadata)
}

export function filterActivityEntries(
  entries: ClientActivityEntry[],
  filter: ActivityFilter,
): ClientActivityEntry[] {
  if (filter === 'all') return entries
  return entries.filter(entry => matchesActivityFilter(entry.action, filter))
}
