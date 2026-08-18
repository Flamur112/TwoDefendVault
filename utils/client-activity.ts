import type { ClientActivityEntry } from '~/types/client'

export const ACTIVITY_RETENTION_DAYS = 14
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

function suffix(value: string | undefined): string {
  return value ? `: ${value}` : ''
}

export function formatClientActivityAction(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  const itemName = typeof metadata?.itemName === 'string' ? metadata.itemName : ''
  const vaultName = typeof metadata?.vaultName === 'string' ? metadata.vaultName : ''
  const title = typeof metadata?.title === 'string' ? metadata.title : ''
  const name = typeof metadata?.name === 'string' ? metadata.name : ''

  switch (action) {
    case 'created':
      return `Created client${suffix(name)}`
    case 'edited':
      return 'Edited client details'
    case 'favorite_toggled':
      return 'Updated favorite status'
    case 'vault_added':
      return `Added vault${suffix(vaultName)}`
    case 'vault_deleted':
      return `Deleted vault${suffix(vaultName)}`
    case 'credential_added':
      return `Added credential${suffix(itemName)}`
    case 'documents_added':
      return `Created document${suffix(title)}`
    case 'documents_updated':
      return `Edited document${suffix(title)}`
    case 'documents_deleted':
      return `Deleted document${suffix(title)}`
    case 'documents_viewed':
      return `Viewed document${suffix(title)}`
    case 'projects_updated':
      return `Updated project${suffix(title)}`
    default: {
      if (action.endsWith('_added') && title) {
        const section = action.replace(/_added$/, '').replace(/_/g, ' ')
        return `Added ${section}${suffix(title)}`
      }
      if (action.endsWith('_updated') && title) {
        const section = action.replace(/_updated$/, '').replace(/_/g, ' ')
        return `Updated ${section}${suffix(title)}`
      }
      if (action.endsWith('_deleted') && title) {
        const section = action.replace(/_deleted$/, '').replace(/_/g, ' ')
        return `Deleted ${section}${suffix(title)}`
      }
      if (itemName) return `${action.replace(/_/g, ' ')}${suffix(itemName)}`
      if (vaultName) return `${action.replace(/_/g, ' ')}${suffix(vaultName)}`
      if (title) return `${action.replace(/_/g, ' ')}${suffix(title)}`
      return action.replace(/_/g, ' ')
    }
  }
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
