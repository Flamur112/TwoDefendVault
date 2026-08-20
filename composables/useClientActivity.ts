import type { ClientActivityEntry } from '~/types/client'

interface ActivityCache {
  entries: ClientActivityEntry[]
  fetchedAt: number
}

const CACHE_TTL_MS = 60_000

export function useClientActivity(
  clientId: Ref<string>,
  options?: {
    filter?: Ref<string | undefined> | string
    limit?: number
  },
) {
  const apiFetch = useApiFetch()
  const cache = useState<Record<string, ActivityCache>>('client-activity-cache', () => ({}))
  const loading = ref(false)

  const cacheKey = computed(() => {
    const filter = typeof options?.filter === 'string'
      ? options.filter
      : options?.filter?.value
    return `${clientId.value}:${filter ?? 'all'}:${options?.limit ?? 50}`
  })

  const activity = computed(() => cache.value[cacheKey.value]?.entries ?? [])

  function invalidate() {
    delete cache.value[cacheKey.value]
  }

  async function load(force = false) {
    const key = cacheKey.value
    const cached = cache.value[key]
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.entries
    }

    loading.value = true
    try {
      const filter = typeof options?.filter === 'string'
        ? options.filter
        : options?.filter?.value

      const data = await apiFetch<{ activity: ClientActivityEntry[] }>(
        `/api/clients/${clientId.value}/activity`,
        {
          query: {
            ...(filter ? { filter } : {}),
            limit: options?.limit ?? 50,
          },
        },
      )
      cache.value[key] = { entries: data.activity, fetchedAt: Date.now() }
      return data.activity
    }
    finally {
      loading.value = false
    }
  }

  return { activity, loading, load, invalidate }
}
