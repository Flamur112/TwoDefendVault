const CACHE_TIMESTAMPS_KEY = 'api-cache-timestamps'

function getCacheTimestamps(nuxtApp: ReturnType<typeof useNuxtApp>) {
  if (!nuxtApp.payload[CACHE_TIMESTAMPS_KEY]) {
    nuxtApp.payload[CACHE_TIMESTAMPS_KEY] = {} as Record<string, number>
  }
  return nuxtApp.payload[CACHE_TIMESTAMPS_KEY] as Record<string, number>
}

/** Client-side cached async data to avoid repeat API calls when navigating back. */
export function useCachedAsyncData<T>(
  key: MaybeRefOrGetter<string>,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number, lazy?: boolean },
) {
  const ttlMs = options?.ttlMs ?? 60_000
  const nuxtApp = useNuxtApp()
  const resolvedKey = computed(() => toValue(key))

  return useAsyncData<T>(
    resolvedKey,
    async () => {
      const data = await fetcher()
      getCacheTimestamps(nuxtApp)[resolvedKey.value] = Date.now()
      return data
    },
    {
      lazy: options?.lazy ?? true,
      server: false,
      getCachedData(key, app) {
        const cacheKey = typeof key === 'string' ? key : resolvedKey.value
        const fetchedAt = getCacheTimestamps(app)[cacheKey]
        if (!fetchedAt || Date.now() - fetchedAt > ttlMs) {
          return undefined
        }
        return app.payload.data[cacheKey] as T | undefined
      },
    },
  )
}

export function invalidateCachedAsyncData(key: string) {
  const nuxtApp = useNuxtApp()
  delete getCacheTimestamps(nuxtApp)[key]
  clearNuxtData(key)
}
