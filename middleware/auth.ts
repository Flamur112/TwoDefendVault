export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { fetchSession } = useSession()

  try {
    const sessionUser = await fetchSession()
    if (!sessionUser) {
      return navigateTo('/login')
    }
  }
  catch {
    return navigateTo('/login')
  }
})
