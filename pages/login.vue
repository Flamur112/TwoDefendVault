<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const { user, fetchSession } = useSession()

await fetchSession()

if (user.value) {
  await navigateTo('/dashboard', { replace: true })
}

const errorMessage = computed(() => {
  if (route.query.error === 'deactivated') {
    return 'Your account has been deactivated. Contact an administrator.'
  }
  if (route.query.error === 'not_invited') {
    return 'You are not authorized to sign in.'
  }
  if (route.query.error === 'domain_not_allowed') {
    return 'Sign-in is restricted to approved company email addresses.'
  }
  return ''
})

function startZohoSignIn() {
  window.location.replace('/api/auth/zoho/init')
}
</script>

<template>
  <main class="login-page">
    <div class="login-card card">
      <img src="/logo.svg" alt="" class="logo" width="64" height="64">
      <h1 class="title">TwoDefend Vault</h1>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <button type="button" class="btn btn-primary sign-in" @click="startZohoSignIn">
        Sign in with Zoho
      </button>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 20% 15%, rgba(107, 140, 255, 0.14), transparent 40%),
    radial-gradient(circle at 80% 85%, rgba(167, 139, 250, 0.1), transparent 38%),
    var(--bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 2.5rem 2rem 2rem;
  text-align: center;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
}

.logo {
  border-radius: 16px;
  margin: 0 auto 1.25rem;
  display: block;
}

.title {
  margin: 0 0 2rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.sign-in {
  display: inline-flex;
  width: 100%;
  justify-content: center;
  padding: 0.65rem 1rem;
}

.error {
  color: var(--danger);
  font-size: 0.875rem;
  margin: 0 0 1rem;
  line-height: 1.45;
}
</style>
