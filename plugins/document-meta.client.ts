export default defineNuxtPlugin(() => {
  const route = useRoute()

  watch(
    () => route.path,
    (path) => {
      const title = pageTitleForPath(path)
      useHead({
        title,
        meta: [{ property: 'og:title', content: `${title} · TwoDefend Vault` }],
      })
    },
    { immediate: true },
  )
})
