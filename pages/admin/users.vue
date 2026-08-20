<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface AdminUser {
  id: string
  email: string
  displayName: string | null
  role: 'admin' | 'member' | 'readonly'
  isActive: boolean
  createdAt: string
  hasSignedIn: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
}

const { user: currentUser } = useSession()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref<string | null>(null)

const newEmail = ref('')
const newDisplayName = ref('')
const newRole = ref<'admin' | 'member' | 'readonly'>('member')
const creating = ref(false)

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ users: AdminUser[] }>('/api/admin/users')
    users.value = data.users
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load users'
  }
  finally {
    loading.value = false
  }
}

await loadUsers()

async function updateUser(userId: string, patch: Partial<Pick<AdminUser, 'role' | 'isActive'>> & { displayName?: string | null }) {
  saving.value = userId
  error.value = ''
  try {
    const data = await $fetch<{ user: AdminUser }>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: patch,
    })
    const idx = users.value.findIndex(u => u.id === userId)
    if (idx !== -1) users.value[idx] = data.user
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Update failed'
    await loadUsers()
  }
  finally {
    saving.value = null
  }
}

async function createUser() {
  creating.value = true
  error.value = ''
  try {
    const data = await $fetch<{ user: AdminUser }>('/api/admin/users', {
      method: 'POST',
      body: {
        email: newEmail.value,
        displayName: newDisplayName.value || null,
        role: newRole.value,
      },
    })
    users.value.push(data.user)
    newEmail.value = ''
    newDisplayName.value = ''
    newRole.value = 'member'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create user'
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="admin-page">
    <header class="header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="text-muted subtitle">
          Manage roles and access for TwoDefend employees
        </p>
      </div>
    </header>

    <p v-if="error" class="error">
      {{ error }}
    </p>

    <section class="card guide">
      <h2>How user management works</h2>
      <ol class="guide-steps">
        <li>
          <strong>Add the user</strong> with their work email and role. They do not receive an invite email from the vault.
        </li>
        <li>
          <strong>First sign-in:</strong> they choose "Sign in with Zoho" on the login page. Their account links automatically if the email matches.
        </li>
        <li>
          <strong>Roles:</strong>
          <em>Admin</em> can manage users and view the audit log;
          <em>Member</em> can edit clients, credentials, and projects;
          <em>Read-only</em> can view but not change data.
        </li>
        <li>
          <strong>Deactivate</strong> when someone leaves. They cannot sign in again; their sessions are revoked immediately.
        </li>
      </ol>
    </section>

    <section class="card">
      <h2>Add user</h2>
      <p class="hint">
        Pre-provision a user by email. They will be linked on first Zoho sign-in.
      </p>
      <form class="form" @submit.prevent="createUser">
        <input v-model="newEmail" type="email" placeholder="Email" required>
        <input v-model="newDisplayName" type="text" placeholder="Display name (optional)">
        <select v-model="newRole">
          <option value="member">
            Member
          </option>
          <option value="admin">
            Admin
          </option>
          <option value="readonly">
            Read-only
          </option>
        </select>
        <button type="submit" class="btn btn-primary" :disabled="creating">
          {{ creating ? 'Adding…' : 'Add user' }}
        </button>
      </form>
    </section>

    <section class="card">
      <h2>Users</h2>
      <p class="hint">
        Provisioned users who have never signed in show "Never". Blocked login attempts from unknown emails appear under
        <NuxtLink to="/admin/sign-ins">Sign-in Activity</NuxtLink>.
      </p>
      <p v-if="loading">
        Loading…
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Sign-in</th>
            <th>Last IP</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.email }}</td>
            <td>{{ u.displayName || 'None' }}</td>
            <td>
              <select
                :value="u.role"
                :disabled="saving === u.id || u.id === currentUser?.id"
                @change="updateUser(u.id, { role: ($event.target as HTMLSelectElement).value as AdminUser['role'] })"
              >
                <option value="admin">
                  Admin
                </option>
                <option value="member">
                  Member
                </option>
                <option value="readonly">
                  Read-only
                </option>
              </select>
            </td>
            <td>
              <span v-if="u.hasSignedIn" class="signed-in">Signed in</span>
              <span v-else class="text-muted">Never</span>
              <span v-if="u.lastLoginAt" class="last-login text-muted">
                {{ new Date(u.lastLoginAt).toLocaleString() }}
              </span>
            </td>
            <td class="mono">{{ u.lastLoginIp || '—' }}</td>
            <td>
              <span :class="u.isActive ? 'active' : 'inactive'">
                {{ u.isActive ? 'Active' : 'Deactivated' }}
              </span>
            </td>
            <td>
              <button
                v-if="u.isActive && u.id !== currentUser?.id"
                type="button"
                class="btn btn-danger"
                :disabled="saving === u.id"
                @click="updateUser(u.id, { isActive: false })"
              >
                Deactivate
              </button>
              <button
                v-else-if="!u.isActive"
                type="button"
                :disabled="saving === u.id"
                @click="updateUser(u.id, { isActive: true })"
              >
                Reactivate
              </button>
              <span v-else class="self-label">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 1rem;
}

.subtitle {
  margin-top: 0.25rem;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.card h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.guide {
  margin-bottom: 1rem;
}

.guide-steps {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  line-height: 1.45;
}

.guide-steps strong {
  color: var(--text);
}

.guide-steps em {
  font-style: normal;
  font-weight: 600;
  color: var(--text);
}

.hint {
  font-size: 0.875rem;
  margin: 0.5rem 0 1rem;
}

.form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.table th,
.table td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--border);
}

.table th {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.active { color: var(--success); }
.inactive { color: var(--danger); }

.signed-in {
  color: var(--success);
  display: block;
}

.last-login {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.15rem;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
}

.hint a {
  color: var(--primary);
}

.self-label {
  color: var(--text-muted);
  font-size: 0.875rem;
}
</style>
