<template>
  <section class="panel card">
    <div class="panel-header">
      <div>
        <span class="panel-kicker panel-kicker--licenses">Licenses</span>
        <h2 class="panel-title">Expiring soon</h2>
      </div>
      <NuxtLink v-if="licenses.length > 0" to="/licenses" class="view-all">
        View all
      </NuxtLink>
    </div>

    <p v-if="loading" class="text-muted empty">Loading…</p>
    <p v-else-if="licenses.length === 0" class="text-muted empty">
      No licenses expiring in the next 30 days.
    </p>
    <ul v-else class="list">
      <li v-for="license in licenses" :key="license.id">
        <NuxtLink :to="license.href" class="license-link">
          <div class="license-top">
            <span class="item-name">{{ license.title }}</span>
            <span
              class="expiry-tag"
              :class="license.expiryStatus === 'expired' ? 'expired' : 'soon'"
            >
              {{ license.expiryLabel }}
            </span>
          </div>
          <span class="meta-line">{{ license.clientName }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardExpiringLicense } from '~/types/dashboard'

defineProps<{
  licenses: DashboardExpiringLicense[]
  loading?: boolean
}>()
</script>

<style scoped>
.panel {
  margin-bottom: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.panel-kicker--licenses {
  color: #fbbf24;
}

.panel-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.view-all {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
}

.view-all:hover {
  text-decoration: underline;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.license-link {
  display: block;
  padding: 0.6rem 0;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--border-subtle);
}

.list li:last-child .license-link {
  border-bottom: none;
}

.license-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.meta-line {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.expiry-tag {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.expiry-tag.expired {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.expiry-tag.soon {
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}

.empty {
  font-size: 0.875rem;
  margin: 0;
}
</style>
