<script setup lang="ts">
import {
  RECORD_VISIBILITY_OPTIONS,
  type RecordVisibility,
} from '~/utils/record-access'

defineProps<{
  modelValue: RecordVisibility
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: RecordVisibility]
}>()
</script>

<template>
  <label class="visibility-field">
    <span class="field-label">Who can view</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as RecordVisibility)"
    >
      <option
        v-for="option in RECORD_VISIBILITY_OPTIONS"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="field-help">
      {{ RECORD_VISIBILITY_OPTIONS.find(o => o.value === modelValue)?.description }}
    </span>
  </label>
</template>

<style scoped>
.visibility-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.field-help {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
