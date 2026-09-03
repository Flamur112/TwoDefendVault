<script setup lang="ts">
import {
  RECORD_VISIBILITY_OPTIONS,
  type RecordVisibility,
} from '~/utils/record-access'

const props = defineProps<{
  visibility: RecordVisibility
  allowedUserIds: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:visibility': [value: RecordVisibility]
  'update:allowedUserIds': [value: string[]]
}>()

const { members, loadMembers } = useOrgMembers()

onMounted(() => {
  loadMembers()
})

const showUserPicker = computed(() => props.visibility === 'restricted')
</script>

<template>
  <div class="access-field">
    <label class="visibility-field">
      <span class="field-label">Who can view</span>
      <select
        :value="visibility"
        :disabled="disabled"
        @change="emit('update:visibility', ($event.target as HTMLSelectElement).value as RecordVisibility)"
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
        {{ RECORD_VISIBILITY_OPTIONS.find(o => o.value === visibility)?.description }}
      </span>
    </label>

    <div v-if="showUserPicker" class="allowed-users">
      <span class="field-label">Allowed team members</span>
      <UiUserMultiSelect
        :model-value="allowedUserIds"
        :users="members ?? []"
        placeholder="Search and add team members…"
        @update:model-value="emit('update:allowedUserIds', $event)"
      />
      <p class="field-help">Admins always have access. Read-only users cannot be selected.</p>
    </div>
  </div>
</template>

<style scoped>
.access-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.visibility-field,
.allowed-users {
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
  margin: 0;
}
</style>
