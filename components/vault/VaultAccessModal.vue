<script setup lang="ts">
import type { OrgMember } from '~/composables/useOrgMembers'

export type VaultAccessLevel = 'read' | 'write' | 'admin'

interface VaultPermissionRow {
  userId: string
  email: string
  displayName: string | null
  role: string
  access: VaultAccessLevel
  grantedAt: string
}

const props = defineProps<{
  vaultId: string
  vaultName: string
}>()

const open = defineModel<boolean>('open', { default: false })

const { members, loadMembers } = useOrgMembers()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const rows = ref<VaultPermissionRow[]>([])
const addUserId = ref('')
const addAccess = ref<VaultAccessLevel>('read')

const ACCESS_OPTIONS: Array<{ value: VaultAccessLevel, label: string, description: string }> = [
  { value: 'read', label: 'Read', description: 'View credentials and files' },
  { value: 'write', label: 'Write', description: 'Add and edit credentials and files' },
  { value: 'admin', label: 'Vault admin', description: 'Full control of this vault' },
]

const eligibleMembers = computed(() =>
  (members.value ?? []).filter(member => member.role !== 'readonly'),
)

const availableToAdd = computed(() => {
  const assigned = new Set(rows.value.map(row => row.userId))
  return eligibleMembers.value.filter(member => !assigned.has(member.id))
})

function memberLabel(member: { displayName: string | null, email: string }): string {
  return member.displayName?.trim() || member.email
}

function roleLabel(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'member') return 'Member'
  return role
}

async function loadPermissions() {
  loading.value = true
  error.value = ''
  try {
    await loadMembers()
    const data = await $fetch<{ permissions: VaultPermissionRow[] }>(
      `/api/vaults/${props.vaultId}/permissions`,
    )
    rows.value = data.permissions
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load access list'
    rows.value = []
  }
  finally {
    loading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    addUserId.value = ''
    addAccess.value = 'read'
    loadPermissions()
  }
})

function addMember() {
  if (!addUserId.value) return
  const member = eligibleMembers.value.find(m => m.id === addUserId.value)
  if (!member) return

  rows.value = [
    ...rows.value,
    {
      userId: member.id,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      access: addAccess.value,
      grantedAt: new Date().toISOString(),
    },
  ]
  addUserId.value = ''
  addAccess.value = 'read'
}

function removeRow(userId: string) {
  rows.value = rows.value.filter(row => row.userId !== userId)
}

function grantAllMembersRead() {
  const existing = new Set(rows.value.map(row => row.userId))
  const additions = eligibleMembers.value
    .filter(member => member.role === 'member' && !existing.has(member.id))
    .map(member => ({
      userId: member.id,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      access: 'read' as VaultAccessLevel,
      grantedAt: new Date().toISOString(),
    }))

  rows.value = [...rows.value, ...additions]
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const data = await $fetch<{ permissions: VaultPermissionRow[] }>(
      `/api/vaults/${props.vaultId}/permissions`,
      {
        method: 'PUT',
        body: {
          permissions: rows.value.map(row => ({
            userId: row.userId,
            access: row.access,
          })),
        },
      },
    )
    rows.value = data.permissions
    open.value = false
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save access'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="open = false">
    <div class="modal card">
      <div class="modal-head">
        <div>
          <h3>Vault access</h3>
          <p class="text-muted subtitle">{{ vaultName }}</p>
        </div>
        <button type="button" class="btn btn-sm" @click="open = false">Close</button>
      </div>

      <p class="intro text-muted">
        Choose which team members can open this vault. Organization admins always have full access.
        Read-only users cannot be granted vault access.
      </p>

      <p v-if="loading" class="text-muted">Loading access list…</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <template v-else>
        <div class="quick-actions">
          <button type="button" class="btn btn-sm" @click="grantAllMembersRead">
            Grant all members read access
          </button>
        </div>

        <div v-if="rows.length === 0" class="empty card-inner">
          <p class="text-muted">No members assigned yet. Only administrators can see this vault.</p>
        </div>

        <div v-else class="access-list">
          <div v-for="row in rows" :key="row.userId" class="access-row">
            <div class="member-info">
              <strong>{{ memberLabel(row) }}</strong>
              <span class="text-muted meta">{{ roleLabel(row.role) }}</span>
            </div>
            <select v-model="row.access" class="access-select">
              <option v-for="option in ACCESS_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <button type="button" class="btn btn-sm btn-danger" @click="removeRow(row.userId)">
              Remove
            </button>
          </div>
        </div>

        <div class="add-row">
          <select v-model="addUserId" class="member-select">
            <option value="">Add team member…</option>
            <option v-for="member in availableToAdd" :key="member.id" :value="member.id">
              {{ memberLabel(member) }} ({{ roleLabel(member.role) }})
            </option>
          </select>
          <select v-model="addAccess" class="access-select">
            <option v-for="option in ACCESS_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button type="button" class="btn btn-sm btn-primary" :disabled="!addUserId" @click="addMember">
            Add
          </button>
        </div>

        <ul class="legend text-muted">
          <li v-for="option in ACCESS_OPTIONS" :key="option.value">
            <strong>{{ option.label }}</strong> — {{ option.description }}
          </li>
        </ul>
      </template>

      <div class="modal-actions">
        <button type="button" class="btn" @click="open = false">Cancel</button>
        <button type="button" class="btn btn-primary" :disabled="saving || loading" @click="save">
          {{ saving ? 'Saving…' : 'Save access' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 220;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.modal-head h3 {
  margin: 0;
}

.subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
}

.intro {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.quick-actions {
  margin-bottom: 0.75rem;
}

.empty {
  margin-bottom: 0.75rem;
  padding: 0.85rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

.access-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.access-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.member-info strong {
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 0.6875rem;
}

.access-select,
.member-select {
  min-width: 7rem;
  font-size: 0.8125rem;
}

.add-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.legend {
  margin: 0 0 1rem;
  padding-left: 1.1rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

.legend li + li {
  margin-top: 0.2rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.error {
  color: var(--danger);
  font-size: 0.8125rem;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .access-row,
  .add-row {
    grid-template-columns: 1fr;
  }
}
</style>
