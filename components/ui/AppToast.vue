<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="true">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="`toast--${toast.type}`"
    >
      {{ toast.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { toasts } = useToast()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  min-width: 220px;
  max-width: min(360px, calc(100vw - 2rem));
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 0.8125rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.toast--success {
  border-color: rgba(74, 222, 128, 0.35);
}

.toast--error {
  border-color: rgba(248, 113, 113, 0.35);
}
</style>
