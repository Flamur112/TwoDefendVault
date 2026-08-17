export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const requestFetch = useRequestFetch()

  try {
    const { user } = await requestFetch<{ user: { id: string } | null }>('/api/auth/me')
    if (!user) {
      return navigateTo('/login')
    }
  }
  catch {
    return navigateTo('/login')
  }
})
