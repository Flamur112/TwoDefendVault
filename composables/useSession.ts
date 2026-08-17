export interface SessionUser {
  id: string
  orgId: string
  email: string
  displayName: string | null
  role: 'admin' | 'member' | 'readonly'
}

export function useSession() {
  const user = useState<SessionUser | null>('session-user', () => null)
  const requestFetch = useRequestFetch()

  async function fetchSession() {
    const data = await requestFetch<{ user: SessionUser | null }>('/api/auth/me')
    user.value = data.user
    return data.user
  }

  async function logout() {
    const { clearKey } = useVaultKey()
    clearKey()
    await requestFetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return {
    user: readonly(user),
    fetchSession,
    logout,
  }
}
