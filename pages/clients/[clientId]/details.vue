<script setup lang="ts">
import type { ClientActivityEntry, ClientRecord } from '~/types/client'

const { user } = useSession()
const ctx = inject<{
  client: Ref<ClientRecord | null>
  clientId: Ref<string>
  reload: () => Promise<void>
}>('clientContext')!

const client = ctx.client
const clientId = ctx.clientId
const reload = ctx.reload
const apiFetch = useApiFetch()

const activity = ref<ClientActivityEntry[]>([])
const loadingActivity = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const form = reactive({
  name: '',
  industry: '',
  onboardedAt: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  notes: '',
  logoUrl: '',
  isFavorite: false,
})

const canWrite = computed(() => user.value?.role !== 'readonly')

watch(client, (c) => {
  if (!c) return
  form.name = c.name
  form.industry = c.industry ?? ''
  form.onboardedAt = c.onboardedAt ?? ''
  form.phone = c.phone ?? ''
  form.website = c.website ?? ''
  form.address = c.address ?? ''
  form.city = c.city ?? ''
  form.state = c.state ?? ''
  form.country = c.country ?? ''
  form.postalCode = c.postalCode ?? ''
  form.notes = c.notes ?? ''
  form.logoUrl = c.logoUrl ?? ''
  form.isFavorite = c.isFavorite
}, { immediate: true })

async function loadActivity() {
  loadingActivity.value = true
  try {
    const data = await apiFetch<{ activity: ClientActivityEntry[] }>(`/api/clients/${clientId.value}/activity`)
    activity.value = data.activity
  }
  finally {
    loadingActivity.value = false
  }
}

await loadActivity()

async function save() {
  if (!canWrite.value) return
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await $fetch(`/api/clients/${clientId.value}`, {
      method: 'PATCH',
      body: {
        name: form.name,
        industry: form.industry || null,
        onboardedAt: form.onboardedAt || null,
        phone: form.phone || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        postalCode: form.postalCode || null,
        notes: form.notes || null,
        logoUrl: form.logoUrl || null,
        isFavorite: form.isFavorite,
      },
    })
    saved.value = true
    await reload()
    await loadActivity()
  }
  catch {
    error.value = 'Failed to save'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="client" class="details-tab">
    <form v-if="canWrite" class="card form" @submit.prevent="save">
      <h3>Client Details</h3>

      <div class="form-grid">
        <label>
          Logo URL
          <input v-model="form.logoUrl" type="url" placeholder="https://…">
        </label>
        <label>
          Client name
          <input v-model="form.name" type="text" required>
        </label>
        <label>
          Industry
          <input v-model="form.industry" type="text">
        </label>
        <label>
          Onboarded date
          <input v-model="form.onboardedAt" type="date">
        </label>
        <label>
          Phone
          <input v-model="form.phone" type="tel">
        </label>
        <label>
          Website
          <input v-model="form.website" type="url">
        </label>
        <label class="full">
          Address
          <input v-model="form.address" type="text">
        </label>
        <label>
          City
          <input v-model="form.city" type="text">
        </label>
        <label>
          State
          <input v-model="form.state" type="text">
        </label>
        <label>
          Country
          <input v-model="form.country" type="text">
        </label>
        <label>
          Postal code
          <input v-model="form.postalCode" type="text">
        </label>
        <label class="full">
          Notes
          <textarea v-model="form.notes" rows="4" />
        </label>
        <label class="checkbox">
          <input v-model="form.isFavorite" type="checkbox">
          Favorite client
        </label>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="saved" class="success">Saved successfully.</p>

      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Saving…' : 'Save Changes' }}
      </button>
    </form>

    <div v-else class="card">
      <p class="text-muted">You have read-only access. Contact an admin to edit client details.</p>
    </div>

    <div class="card activity-section">
      <ClientsActivityFeed :entries="activity" :loading="loadingActivity" title="Activity Log" :retention-days="14" />
    </div>
  </div>
</template>

<style scoped>
.form h3 {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

label.full { grid-column: 1 / -1; }

label.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  color: var(--text);
}

.error { color: var(--danger); }
.success { color: var(--success); }

.activity-section {
  margin-top: 1rem;
}
</style>
