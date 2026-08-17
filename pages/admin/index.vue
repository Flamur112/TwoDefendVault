<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const { user } = useSession()
</script>

<template>
  <div class="admin-page">
    <h1 class="page-title">Admin Dashboard</h1>
    <p class="text-muted subtitle">
      Signed in as {{ user?.displayName || user?.email }}
    </p>

    <nav class="admin-grid">
      <NuxtLink to="/admin/users" class="admin-card card">
        <h2>Users</h2>
        <p class="text-muted">Manage roles, provision employees, deactivate accounts</p>
      </NuxtLink>
      <NuxtLink to="/admin/audit" class="admin-card card">
        <h2>Audit Log</h2>
        <p class="text-muted">View security and access events</p>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.subtitle {
  margin: -0.5rem 0 1.5rem;
}

.admin-grid {
  display: grid;
  gap: 0.75rem;
}

.admin-card {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}

.admin-card:hover {
  border-color: var(--primary);
}

.admin-card h2 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.admin-card p {
  margin: 0;
  font-size: 0.875rem;
}
</style>
