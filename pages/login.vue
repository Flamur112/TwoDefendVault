<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const { user, fetchSession, logout } = useSession()

// Sync session before render so SSR and client markup match (cookies forwarded via useRequestFetch)
await fetchSession()

const errorMessage = computed(() => {
  if (route.query.error === 'deactivated') {
    return 'Your account has been deactivated. Contact an administrator.'
  }
  return ''
})

const signingOut = ref(false)

async function signOutAndRetry() {
  signingOut.value = true
  try {
    await logout()
  }
  finally {
    signingOut.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-card card">
      <img src="/logo.svg" alt="TwoDefend" class="logo" width="48" height="48">
      <h1>TwoDefend</h1>

      <template v-if="user">
        <p class="text-muted">You are already signed in.</p>
        <p class="signed-in-as">{{ user.displayName || user.email }}</p>
        <div class="actions">
          <NuxtLink to="/dashboard" class="btn btn-primary">Continue to Dashboard</NuxtLink>
          <button type="button" class="btn" :disabled="signingOut" @click="signOutAndRetry">
            {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </div>
        <p class="hint text-muted">
          To switch Zoho accounts, sign out first, then use the button below.
        </p>
        <a href="/api/auth/zoho/init" class="btn sign-in-secondary">Sign in with Zoho</a>
      </template>

      <template v-else>
        <p class="text-muted">Sign in to access the credential vault.</p>
        <p v-if="errorMessage" class="error">
          {{ errorMessage }}
        </p>
        <a href="/api/auth/zoho/init" class="btn btn-primary sign-in">
          Sign in with Zoho
        </a>
      </template>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  text-align: center;
  padding: 2rem;
}

.logo {
  margin-bottom: 1rem;
  border-radius: 10px;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: var(--primary);
}

.signed-in-as {
  font-weight: 600;
  margin: 0.5rem 0 1rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sign-in,
.sign-in-secondary {
  display: inline-flex;
  margin-top: 1rem;
  width: 100%;
  justify-content: center;
  text-decoration: none;
}

.hint {
  font-size: 0.8125rem;
  margin: 1rem 0 0;
}

.error {
  color: var(--danger);
  font-size: 0.875rem;
  margin-top: 0.75rem;
}
</style>
