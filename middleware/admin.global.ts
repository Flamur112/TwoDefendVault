export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const { user, fetchSession } = useSession()
  if (!user.value) {
    await fetchSession()
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  if (user.value.role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
