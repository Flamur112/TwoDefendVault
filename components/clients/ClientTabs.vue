<template>
  <nav class="client-tabs">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.slug"
      :to="tab.to"
      class="tab"
      :class="{ active: isActive(tab) }"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const props = defineProps<{ clientId: string }>()
const route = useRoute()

const clientIdValue = computed(() => props.clientId)

const tabs = computed(() => {
  const base = `/clients/${clientIdValue.value}`
  return [
    { label: 'Overview', slug: 'overview', to: base },
    { label: 'Credentials', slug: 'credentials', to: `${base}/credentials` },
    { label: 'Documents', slug: 'documents', to: `${base}/documents` },
    { label: 'Assets', slug: 'assets', to: `${base}/assets` },
    { label: 'Files', slug: 'files', to: `${base}/files` },
    { label: 'Locations', slug: 'locations', to: `${base}/locations` },
    { label: 'Licenses', slug: 'licenses', to: `${base}/licenses` },
    { label: 'Projects', slug: 'projects', to: `${base}/projects` },
    { label: 'Details', slug: 'details', to: `${base}/details` },
  ]
})

function isActive(tab: { slug: string, to: string }) {
  if (tab.slug === 'overview') {
    return route.path === tab.to || route.path === `${tab.to}/`
  }
  return route.path.startsWith(tab.to)
}
</script>

<style scoped>
.client-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.25rem;
  overflow-x: auto;
}

.tab {
  padding: 0.65rem 1rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.15s;
}

.tab:hover {
  color: var(--text);
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
</style>
