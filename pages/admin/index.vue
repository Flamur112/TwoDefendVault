<script setup lang="ts">
import { AUDIT_RETENTION_DAYS } from '~/utils/retention'

definePageMeta({ middleware: 'auth' })

const { user } = useSession()
</script>

<template>
  <div class="admin-page">
    <h1 class="page-title">Admin Dashboard</h1>
    <p class="text-muted subtitle">
      Signed in as {{ user?.displayName || user?.email }}
    </p>

    <section class="card guide">
      <h2 class="guide-title">Admin guide</h2>
      <p class="text-muted guide-lead">
        Use the sections below to manage who can access the vault and review security activity.
      </p>
      <dl class="guide-list">
        <div>
          <dt>Users</dt>
          <dd>
            Add employees by email before their first sign-in, set roles (Admin, Member, Read-only),
            and deactivate accounts when someone leaves. Users sign in with Zoho; no passwords are managed here.
          </dd>
        </div>
        <div>
          <dt>Sign-in activity</dt>
          <dd>
            See who signed in successfully, who was blocked, and from which IP address.
            Useful for spotting unauthorized login attempts after enabling SSO restrictions.
          </dd>
        </div>
        <div>
          <dt>Access control</dt>
          <dd>
            Restrict documents, assets, files, and licenses to specific roles (Everyone, Members only, or Admins only).
            On each client’s Credentials tab, use <strong>Manage access</strong> on a vault to choose which team members can open it.
          </dd>
        </div>
        <div>
          <dt>Audit log</dt>
          <dd>
            Review sign-ins, credential access, and admin changes. Entries are kept for
            {{ AUDIT_RETENTION_DAYS }} days. Timestamps appear in each admin's local timezone.
          </dd>
        </div>
      </dl>
    </section>

    <nav class="admin-grid">
      <NuxtLink to="/admin/users" class="admin-card card">
        <h2>Users</h2>
        <p class="text-muted">Provision employees, assign roles, deactivate accounts</p>
      </NuxtLink>
      <NuxtLink to="/admin/sign-ins" class="admin-card card">
        <h2>Sign-in Activity</h2>
        <p class="text-muted">Successful sign-ins and blocked attempts with IP addresses</p>
      </NuxtLink>
      <NuxtLink to="/admin/audit" class="admin-card card">
        <h2>Audit Log</h2>
        <p class="text-muted">Review sign-ins, access events, and admin actions</p>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.subtitle {
  margin: -0.5rem 0 1.5rem;
}

.guide {
  margin-bottom: 1.25rem;
}

.guide-title {
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
}

.guide-lead {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
}

.guide-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.guide-list dt {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.guide-list dd {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.45;
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
