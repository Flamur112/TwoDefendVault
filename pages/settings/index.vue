<script setup lang="ts">
import {
  ACTIVITY_RETENTION_DAYS,
  AUDIT_RETENTION_DAYS,
  SESSION_RETENTION_DAYS,
} from '~/utils/retention'
import { SESSION_MAX_AGE_SECONDS } from '~/utils/session-display'

definePageMeta({ middleware: 'auth' })

interface ProfileUser {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: 'admin' | 'member' | 'readonly'
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  signInProvider: string | null
  linkedAt: string | null
}

const apiFetch = useApiFetch()
const { user: sessionUser, setSessionUser, logout } = useSession()
const toast = useToast()

const profile = ref<ProfileUser | null>(null)
const displayName = ref('')
const loading = ref(true)
const saving = ref(false)
const revoking = ref(false)
const error = ref('')

const ROLE_LABELS: Record<ProfileUser['role'], string> = {
  admin: 'Administrator',
  member: 'Member',
  readonly: 'Read-only',
}

const PROVIDER_LABELS: Record<string, string> = {
  zoho: 'Zoho',
}

const sessionHours = computed(() => Math.round(SESSION_MAX_AGE_SECONDS / 3600))

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString()
}

function providerLabel(provider: string | null): string {
  if (!provider) return 'Not linked yet'
  return PROVIDER_LABELS[provider] ?? provider
}

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ user: ProfileUser }>('/api/profile')
    profile.value = data.user
    displayName.value = data.user.displayName ?? ''
  }
  catch {
    error.value = 'Failed to load profile'
  }
  finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!profile.value) return
  saving.value = true
  error.value = ''
  try {
    const data = await apiFetch<{ user: ProfileUser }>('/api/profile', {
      method: 'PATCH',
      body: { displayName: displayName.value.trim() || null },
    })
    profile.value = data.user
    displayName.value = data.user.displayName ?? ''
    if (sessionUser.value) {
      setSessionUser({
        ...sessionUser.value,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
      })
    }
    toast.show('Profile updated')
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save profile'
    toast.show('Could not save profile', 'error')
  }
  finally {
    saving.value = false
  }
}

async function revokeOtherSessions() {
  revoking.value = true
  error.value = ''
  try {
    await apiFetch('/api/profile/revoke-sessions', { method: 'POST' })
    toast.show('Signed out on other devices')
  }
  catch {
    error.value = 'Failed to revoke other sessions'
    toast.show('Could not revoke other sessions', 'error')
  }
  finally {
    revoking.value = false
  }
}

await loadProfile()
</script>

<template>
  <div class="settings-page">
    <header class="header">
      <div>
        <h1 class="page-title">Profile</h1>
        <p class="text-muted subtitle">
          Manage your display name and account security.
        </p>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="text-muted">Loading profile…</p>

    <template v-else-if="profile">
      <section class="card profile-hero">
        <UiUserAvatar
          :name="profile.displayName || profile.email"
          :avatar-url="profile.avatarUrl"
          :size="72"
        />
        <div class="profile-hero-copy">
          <h2>{{ profile.displayName || profile.email }}</h2>
          <p class="text-muted">{{ profile.email }}</p>
          <p class="text-muted avatar-note">Photo syncs from Zoho each time you sign in.</p>
        </div>
      </section>

      <section class="card">
        <h2>Your details</h2>
        <form class="form" @submit.prevent="saveProfile">
          <label class="field">
            <span>Display name</span>
            <input v-model="displayName" type="text" maxlength="80" placeholder="Your name">
          </label>
          <label class="field">
            <span>Email</span>
            <input :value="profile.email" type="email" disabled>
          </label>
          <label class="field">
            <span>Role</span>
            <input :value="ROLE_LABELS[profile.role]" type="text" disabled>
          </label>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </form>
      </section>

      <section class="card">
        <h2>Sign-in</h2>
        <dl class="details">
          <div>
            <dt>Provider</dt>
            <dd>{{ providerLabel(profile.signInProvider) }}</dd>
          </div>
          <div>
            <dt>Linked</dt>
            <dd>{{ formatDate(profile.linkedAt) }}</dd>
          </div>
          <div>
            <dt>Last sign-in</dt>
            <dd>{{ formatDate(profile.lastLoginAt) }}</dd>
          </div>
          <div>
            <dt>Last IP</dt>
            <dd class="mono">{{ profile.lastLoginIp || 'None' }}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{{ formatDate(profile.createdAt) }}</dd>
          </div>
          <div>
            <dt>Session length</dt>
            <dd>{{ sessionHours }} hours, then sign in again</dd>
          </div>
        </dl>
      </section>

      <section class="card">
        <h2>Security</h2>
        <p class="hint">
          Sign out everywhere else if you changed devices or suspect someone else used your account.
          Your current browser session stays active.
        </p>
        <div class="actions">
          <button
            type="button"
            class="btn"
            :disabled="revoking"
            @click="revokeOtherSessions"
          >
            {{ revoking ? 'Working…' : 'Sign out other devices' }}
          </button>
          <button type="button" class="btn btn-danger" @click="logout">
            Sign out
          </button>
        </div>
      </section>

      <section class="card muted-card">
        <h2>Data retention</h2>
        <p class="hint">
          Old logs are removed automatically so the vault stays fast. Activity feeds keep
          {{ ACTIVITY_RETENTION_DAYS }} days, audit and sign-in logs keep
          {{ AUDIT_RETENTION_DAYS }} days, and expired sessions are cleared after
          {{ SESSION_RETENTION_DAYS }} days.
        </p>
        <p v-if="profile.role === 'admin'" class="hint admin-link">
          <NuxtLink to="/admin">Open admin</NuxtLink>
          to manage users, sign-in activity, and audit logs.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 1rem;
}

.subtitle {
  margin: 0.35rem 0 0;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.card {
  margin-bottom: 1rem;
}

.card h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-hero-copy h2 {
  margin: 0 0 0.2rem;
  font-size: 1.125rem;
}

.profile-hero-copy p {
  margin: 0;
}

.avatar-note {
  margin-top: 0.35rem !important;
  font-size: 0.75rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-width: 28rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8125rem;
}

.field span {
  color: var(--text-muted);
  font-weight: 600;
}

.field input:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem 1rem;
  margin: 0;
}

.details dt {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.15rem;
}

.details dd {
  margin: 0;
  font-size: 0.875rem;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}

.hint {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.muted-card {
  background: var(--bg-subtle);
}

.admin-link a {
  color: var(--primary);
}
</style>
