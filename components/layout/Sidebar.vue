<template>
  <aside class="sidebar" :class="{ collapsed }">
    <NuxtLink to="/dashboard" class="sidebar-brand" aria-label="TwoDefend home">
      <img src="/logo.svg" alt="" class="brand-logo" width="28" height="28">
      <span v-if="!collapsed" class="brand-name">TwoDefend</span>
    </NuxtLink>

    <nav class="nav">
      <div class="section">
        <NuxtLink v-for="item in mainNav" :key="item.to" :to="item.to" class="nav-item" :title="item.label">
          <span class="icon" v-html="item.icon" />
          <span v-if="!collapsed" class="label">{{ item.label }}</span>
        </NuxtLink>
      </div>

      <div v-if="isAdmin" class="section">
        <div v-if="!collapsed" class="section-label">ADMIN</div>
        <NuxtLink v-for="item in adminNav" :key="item.to" :to="item.to" class="nav-item" :title="item.label">
          <span class="icon" v-html="item.icon" />
          <span v-if="!collapsed" class="label">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <button type="button" class="collapse-btn" :title="collapsed ? 'Expand' : 'Collapse'" @click="toggle">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path v-if="collapsed" d="M9 18l6-6-6-6" />
        <path v-else d="M15 18l-6-6 6-6" />
      </svg>
      <span v-if="!collapsed">Collapse</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
const { user } = useSession()
const { collapsed, toggle } = useSidebar()

const isAdmin = computed(() => user.value?.role === 'admin')

const iconGrid = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'
const iconBuilding = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>'
const iconServer = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>'
const iconFolder = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'
const iconLicense = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6M7 16h4"/></svg>'
const iconUsers = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>'
const iconAudit = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
const iconSignIn = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'

const mainNav = [
  { label: 'Dashboard', to: '/dashboard', icon: iconGrid },
  { label: 'Clients', to: '/clients', icon: iconBuilding },
  { label: 'Assets', to: '/assets', icon: iconServer },
  { label: 'Licenses', to: '/licenses', icon: iconLicense },
  { label: 'Projects', to: '/projects', icon: iconFolder },
]

const adminNav = [
  { label: 'Users', to: '/admin/users', icon: iconUsers },
  { label: 'Sign-ins', to: '/admin/sign-ins', icon: iconSignIn },
  { label: 'Audit Log', to: '/admin/audit', icon: iconAudit },
]
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 110;
  transition: width 0.2s ease;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: var(--navbar-h);
  padding: 0 0.85rem;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
  color: var(--text);
  flex-shrink: 0;
}

.sidebar-brand:hover {
  color: var(--primary);
}

.brand-logo {
  display: block;
  border-radius: 6px;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar.collapsed .sidebar-brand {
  justify-content: center;
  padding: 0;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.5rem;
}

.section {
  margin-bottom: 1rem;
}

.section-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 0.5rem 0.75rem 0.35rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.nav-item:hover {
  color: var(--text-secondary);
}

.nav-item.router-link-active {
  background: var(--bg-subtle);
  color: var(--text);
  font-weight: 500;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapsed .section-label,
.collapsed .label {
  display: none;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 0.6rem;
}

.collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8125rem;
}

.collapse-btn:hover {
  color: var(--text);
  border-color: var(--primary);
}

.collapsed .collapse-btn {
  justify-content: center;
  padding: 0.6rem;
}

.collapsed .collapse-btn span {
  display: none;
}
</style>
