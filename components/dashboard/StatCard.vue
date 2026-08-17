<template>
  <div class="stat-card" :class="`stat-card--${tone}`">
    <span class="value">{{ value }}</span>
    <span class="label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: number | string
  tone?: 'clients' | 'credentials' | 'favorites'
}>(), {
  tone: 'clients',
})
</script>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.15rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--card);
}

.stat-card--clients { border-top: 2px solid var(--accent-violet); }
.stat-card--credentials { border-top: 2px solid var(--accent-teal); }
.stat-card--favorites { border-top: 2px solid var(--favorite); }

.value {
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
}

.stat-card--clients .value { color: #ddd6fe; }
.stat-card--credentials .value { color: #99f6e4; }
.stat-card--favorites .value { color: #fde68a; }

.label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
}

.stat-card--clients .label { color: var(--accent-violet); }
.stat-card--credentials .label { color: var(--accent-teal); }
.stat-card--favorites .label { color: var(--favorite); }
</style>
