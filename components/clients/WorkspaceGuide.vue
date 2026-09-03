<script setup lang="ts">
import { CLIENT_WORKSPACE_TABS, clientTabPath } from '~/utils/client-sections'

defineProps<{
  clientId: string
}>()
</script>

<template>
  <div class="workspace-guide card">
    <div class="guide-header">
      <h3>Workspace</h3>
      <p class="text-muted intro">
        Each tab has a specific purpose. Use the guide below to keep credentials, files, and documentation organized.
      </p>
    </div>
    <div class="tab-grid">
      <NuxtLink
        v-for="tab in CLIENT_WORKSPACE_TABS"
        :key="tab.slug"
        :to="clientTabPath(clientId, tab.slug)"
        class="tab-link"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-summary">{{ tab.summary }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.workspace-guide {
  padding: 1rem;
  margin-bottom: 1rem;
}

.guide-header h3 {
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
}

.intro {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  max-width: 42rem;
}

.tab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.5rem;
}

.tab-link {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

.tab-link:hover {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
}

.tab-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary);
}

.tab-summary {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-muted);
}
</style>
