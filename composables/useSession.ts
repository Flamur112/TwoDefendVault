export interface SessionUser {
  id: string
  orgId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: 'admin' | 'member' | 'readonly'
}

export function useSession() {
  const user = useState<SessionUser | null>('session-user', () => null)
  const sessionLoaded = useState('session-loaded', () => false)
  const sessionInflight = useState<Promise<SessionUser | null> | null>('session-inflight', () => null)
  const requestFetch = useRequestFetch()

  async function fetchSession(force = false): Promise<SessionUser | null> {
    if (!force && sessionLoaded.value) {
      return user.value
    }

    if (!force && sessionInflight.value) {
      return sessionInflight.value
    }

    sessionInflight.value = requestFetch<{ user: SessionUser | null }>('/api/auth/me')
      .then((data) => {
        user.value = data.user
        sessionLoaded.value = true
        return data.user
      })
      .finally(() => {
        sessionInflight.value = null
      })

    return sessionInflight.value
  }

  async function logout() {
    const { clearKey } = useVaultKey()
    clearKey()
    user.value = null
    sessionLoaded.value = false

    try {
      await requestFetch('/api/auth/logout', { method: 'POST' })
    }
    catch {
      // Still redirect — cookie may already be cleared or session expired
    }

    await navigateTo('/login')
  }

  function setSessionUser(next: SessionUser) {
    user.value = next
  }

  return {
    user: readonly(user),
    fetchSession,
    refreshSession: () => fetchSession(true),
    setSessionUser,
    logout,
  }
}
