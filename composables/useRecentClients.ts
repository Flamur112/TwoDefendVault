const STORAGE_KEY = 'td-recent-clients'
const MAX = 5

export function useRecentClients() {
  const recentIds = useState<string[]>('td-recent-clients', () => [])

  function refreshFromStorage() {
    if (!import.meta.client) return
    try {
      recentIds.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    }
    catch {
      recentIds.value = []
    }
  }

  function track(clientId: string) {
    if (!import.meta.client) return
    const list = recentIds.value.filter(id => id !== clientId)
    list.unshift(clientId)
    const trimmed = list.slice(0, MAX)
    recentIds.value = trimmed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  }

  return {
    recentIds: readonly(recentIds),
    track,
    refreshFromStorage,
  }
}
