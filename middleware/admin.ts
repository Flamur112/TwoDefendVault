export default defineNuxtRouteMiddleware(async () => {
  const { user, fetchSession } = useSession()
  await fetchSession()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (user.value.role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
