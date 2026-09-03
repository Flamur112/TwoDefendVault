<script setup lang="ts">
import { parseRecordVisibility, visibilityLabel } from '~/utils/record-access'

const props = defineProps<{
  metadata: Record<string, string>
}>()

const label = computed(() => visibilityLabel(parseRecordVisibility(props.metadata), props.metadata))
const visible = computed(() => parseRecordVisibility(props.metadata) !== 'all')
</script>

<template>
  <span v-if="visible" class="visibility-badge">{{ label }}</span>
</template>

<style scoped>
.visibility-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}
</style>
