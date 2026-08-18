<script setup lang="ts">
export interface SelectableUser {
  id: string
  email: string
  displayName: string | null
}

const props = withDefaults(defineProps<{
  users: SelectableUser[]
  modelValue: string[]
  placeholder?: string
  emptyHint?: string
}>(), {
  placeholder: 'Search by name or email…',
  emptyHint: 'No matching team members.',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const open = ref(false)
const activeIndex = ref(0)

const selectedUsers = computed(() =>
  props.modelValue
    .map(id => props.users.find(user => user.id === id))
    .filter((user): user is SelectableUser => !!user),
)

const normalizedQuery = computed(() => query.value.trim().toLowerCase())

const availableUsers = computed(() => {
  const selected = new Set(props.modelValue)
  let list = props.users.filter(user => !selected.has(user.id))

  if (normalizedQuery.value) {
    list = list.filter((user) => {
      const name = user.displayName?.trim().toLowerCase() ?? ''
      const email = user.email.toLowerCase()
      return name.includes(normalizedQuery.value) || email.includes(normalizedQuery.value)
    })
  }

  return list.slice(0, 12)
})

function userLabel(user: SelectableUser): string {
  return user.displayName?.trim() || user.email
}

function userSecondary(user: SelectableUser): string | null {
  if (user.displayName?.trim()) return user.email
  return null
}

function openDropdown() {
  open.value = true
  activeIndex.value = 0
}

function closeDropdown() {
  open.value = false
  activeIndex.value = 0
}

function addUser(user: SelectableUser) {
  if (props.modelValue.includes(user.id)) return
  emit('update:modelValue', [...props.modelValue, user.id])
  query.value = ''
  activeIndex.value = 0
  searchInput.value?.focus()
}

function removeUser(userId: string) {
  emit('update:modelValue', props.modelValue.filter(id => id !== userId))
}

function onSearchInput() {
  openDropdown()
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDropdown()
    return
  }

  if (!open.value || availableUsers.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, availableUsers.value.length - 1)
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    const user = availableUsers.value[activeIndex.value]
    if (user) addUser(user)
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="root" class="user-multi-select">
    <div v-if="selectedUsers.length > 0" class="selected-chips">
      <span v-for="user in selectedUsers" :key="user.id" class="selected-chip">
        <span class="chip-label">{{ userLabel(user) }}</span>
        <button
          type="button"
          class="chip-remove"
          :aria-label="`Remove ${userLabel(user)}`"
          @click="removeUser(user.id)"
        >
          ×
        </button>
      </span>
    </div>

    <div class="search-wrap">
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="search-input"
        :placeholder="placeholder"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        @focus="openDropdown"
        @input="onSearchInput"
        @keydown="onSearchKeydown"
      >

      <ul v-if="open" class="results" role="listbox">
        <li v-if="availableUsers.length === 0" class="result-empty text-muted">
          {{ normalizedQuery ? emptyHint : 'All matching members are already assigned.' }}
        </li>
        <li
          v-for="(user, index) in availableUsers"
          :key="user.id"
          role="option"
          :aria-selected="index === activeIndex"
          class="result-item"
          :class="{ active: index === activeIndex }"
          @mousedown.prevent="addUser(user)"
        >
          <span class="result-name">{{ userLabel(user) }}</span>
          <span v-if="userSecondary(user)" class="result-email text-muted">{{ userSecondary(user) }}</span>
        </li>
      </ul>
    </div>

    <p v-if="users.length === 0" class="text-muted field-note">No active team members found.</p>
    <p v-else class="text-muted field-note">Type a name or email, then pick from the list.</p>
  </div>
</template>

<style scoped>
.user-multi-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  padding: 0.15rem 0.35rem 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 0.8125rem;
}

.chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.chip-remove:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.search-wrap {
  position: relative;
}

.search-input {
  width: 100%;
}

.results {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 0.35rem 0;
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.result-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.result-item:hover,
.result-item.active {
  background: var(--primary-soft);
}

.result-name {
  display: block;
  font-size: 0.875rem;
}

.result-email {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.1rem;
}

.result-empty {
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
}

.field-note {
  margin: 0;
  font-size: 0.75rem;
}
</style>
