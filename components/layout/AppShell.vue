<template>
  <div class="app-shell" :class="{ collapsed: collapsed }">
    <LayoutSidebar />
    <div class="app-main">
      <LayoutTopNav />
      <main class="app-content">
        <slot />
      </main>
    </div>
    <UiAppToast />
  </div>
</template>

<script setup lang="ts">
const { collapsed } = useSidebar()
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: var(--sidebar-w);
  transition: margin-left 0.2s ease;
}

.app-shell.collapsed .app-main {
  margin-left: var(--sidebar-collapsed);
}

.app-content {
  flex: 1;
  padding: 1.25rem 1.5rem;
  margin-top: var(--navbar-h);
  overflow-y: auto;
}
</style>
