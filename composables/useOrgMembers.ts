export interface OrgMember {
  id: string
  email: string
  displayName: string | null
  role: string
}

export function useOrgMembers() {
  const apiFetch = useApiFetch()
  const members = useState<OrgMember[] | null>('org-members-cache', () => null)
  const loading = ref(false)

  async function loadMembers(force = false) {
    if (!force && members.value) return members.value

    loading.value = true
    try {
      const data = await apiFetch<{ members: OrgMember[] }>('/api/org/members')
      members.value = data.members
      return data.members
    }
    catch {
      members.value = []
      return []
    }
    finally {
      loading.value = false
    }
  }

  function invalidate() {
    members.value = null
  }

  return { members, loading, loadMembers, invalidate }
}
