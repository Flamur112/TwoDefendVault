<script setup lang="ts">
import type { SectionGuide } from '~/utils/client-sections'

defineProps<{
  guide: SectionGuide
  compact?: boolean
}>()
</script>

<template>
  <div class="section-guide card" :class="{ compact }">
    <p class="summary">{{ guide.summary }}</p>

    <div v-if="guide.useFor.length > 0" class="guide-grid">
      <div class="guide-block">
        <h4 class="guide-heading">Use this for</h4>
        <ul>
          <li v-for="item in guide.useFor" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div v-if="guide.notFor?.length" class="guide-block">
        <h4 class="guide-heading muted-heading">Store elsewhere</h4>
        <ul>
          <li v-for="item in guide.notFor" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div v-if="guide.tips?.length" class="guide-block tips">
      <h4 class="guide-heading">Tips</h4>
      <ul>
        <li v-for="tip in guide.tips" :key="tip">{{ tip }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.section-guide {
  margin-bottom: 0.75rem;
  padding: 0.85rem 1rem;
}

.section-guide.compact {
  padding: 0.75rem 0.85rem;
}

.summary {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.75rem 1.25rem;
}

.guide-block {
  min-width: 0;
}

.guide-heading {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text);
}

.muted-heading {
  color: var(--text-muted);
}

.guide-block ul {
  margin: 0;
  padding-left: 1.1rem;
}

.guide-block li {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.guide-block li + li {
  margin-top: 0.2rem;
}

.tips {
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--border);
}
</style>
