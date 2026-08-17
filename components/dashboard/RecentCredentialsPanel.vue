<template>
  <section class="panel card">
    <div class="panel-header">
      <div>
        <span class="panel-kicker panel-kicker--credentials">Credentials</span>
        <h2 class="panel-title">Recently updated</h2>
      </div>
    </div>

    <p v-if="loading" class="text-muted empty">Loading…</p>
    <p v-else-if="credentials.length === 0" class="text-muted empty">
      Credentials you update will show up here for quick access.
    </p>
    <ul v-else class="list">
      <li v-for="credential in credentials" :key="credential.id">
        <NuxtLink :to="credential.href" class="cred-link">
          <div class="cred-top">
            <span class="item-name">{{ credential.name }}</span>
            <span class="type-tag">{{ credential.itemTypeLabel }}</span>
          </div>
          <span class="meta-line">
            {{ credential.clientName || 'No client' }} · {{ credential.vaultName }}
          </span>
          <span class="cred-time">{{ formatWhen(credential.updatedAt) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { DashboardRecentCredential } from '~/types/dashboard'

defineProps<{
  credentials: DashboardRecentCredential[]
  loading?: boolean
}>()

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.panel {
  margin-bottom: 0;
}

.panel-header {
  margin-bottom: 0.75rem;
}

.panel-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cred-link {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 1rem;
  padding: 0.6rem 0;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--border-subtle);
}

.list li:last-child .cred-link {
  border-bottom: none;
}

.cred-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  grid-column: 1 / -1;
}

.cred-top .item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cred-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
  white-space: nowrap;
}

.empty {
  font-size: 0.875rem;
  margin: 0;
}
</style>
