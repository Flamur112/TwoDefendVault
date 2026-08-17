/** Shared search query for page-level list filtering. */
export function useAppSearch() {
  const query = useState<string>('app-search-query', () => '')

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())

  function clearSearch() {
    query.value = ''
  }

  /** Case-insensitive match against one or more strings. */
  function matchesSearch(...parts: Array<string | null | undefined>): boolean {
    const needle = normalizedQuery.value
    if (!needle) return true
    return parts.some(part => (part ?? '').toLowerCase().includes(needle))
  }

  /** Routes that render their own PageSearch input (hide duplicate in top nav). */
  function hasDedicatedPageSearch(path: string): boolean {
    if (path === '/clients' || path === '/clients/') return true
    if (path === '/assets' || path === '/assets/') return true
    if (path === '/projects' || path === '/projects/') return true
    return /^\/clients\/[^/]+\/(credentials|documents|assets|files|locations|licenses|projects)\/?$/.test(path)
  }

  /** Search scope key; used to clear query when navigating between scopes. */
  function getSearchContext(path: string): string | null {
    if (path === '/clients' || path === '/clients/') return 'clients'
    if (path === '/assets' || path === '/assets/') return 'org:assets'
    if (path === '/projects' || path === '/projects/') return 'org:projects'

    const clientSectionMatch = path.match(/^\/clients\/([^/]+)\/(credentials|documents|assets|files|locations|licenses|projects)\/?$/)
    if (clientSectionMatch) return `client:${clientSectionMatch[1]}`

    return null
  }

  return {
    query,
    normalizedQuery,
    clearSearch,
    matchesSearch,
    hasDedicatedPageSearch,
    getSearchContext,
  }
}

export function useAppSearchPlaceholder(text: string) {
  const placeholder = useState('app-search-placeholder', () => 'Search clients...')

  watchEffect(() => {
    placeholder.value = text
  })
}
