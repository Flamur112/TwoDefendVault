/** SSR-safe fetch that forwards cookies during server rendering. */
export function useApiFetch() {
  return useRequestFetch()
}
