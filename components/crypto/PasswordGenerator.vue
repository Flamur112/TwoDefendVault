<template>
  <div class="password-generator">
    <button type="button" class="toggle" @click="open = !open">
      {{ open ? 'Hide generator' : 'Generate password' }}
    </button>

    <div v-if="open" class="panel">
      <label>
        Length: {{ length }}
        <input v-model.number="length" type="range" min="8" max="64">
      </label>

      <div class="checks">
        <label><input v-model="uppercase" type="checkbox"> Uppercase</label>
        <label><input v-model="lowercase" type="checkbox"> Lowercase</label>
        <label><input v-model="numbers" type="checkbox"> Numbers</label>
        <label><input v-model="symbols" type="checkbox"> Symbols</label>
        <label><input v-model="excludeAmbiguous" type="checkbox"> Exclude ambiguous</label>
      </div>

      <p v-if="genError" class="error">
        {{ genError }}
      </p>

      <div class="actions">
        <button type="button" @click="generate">
          Generate
        </button>
        <span v-if="lastGenerated" class="preview">{{ maskedPreview }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { generatePassword } from '~/utils/password-generator'

const emit = defineEmits<{ generated: [password: string] }>()

const open = ref(false)
const length = ref(20)
const uppercase = ref(true)
const lowercase = ref(true)
const numbers = ref(true)
const symbols = ref(true)
const excludeAmbiguous = ref(true)
const genError = ref('')
const lastGenerated = ref('')

const maskedPreview = computed(() =>
  lastGenerated.value ? '•'.repeat(Math.min(lastGenerated.value.length, 16)) : '',
)

function generate() {
  genError.value = ''
  try {
    const password = generatePassword({
      length: length.value,
      uppercase: uppercase.value,
      lowercase: lowercase.value,
      numbers: numbers.value,
      symbols: symbols.value,
      excludeAmbiguous: excludeAmbiguous.value,
    })
    lastGenerated.value = password
    emit('generated', password)
  }
  catch (e: unknown) {
    genError.value = e instanceof Error ? e.message : 'Generation failed'
  }
}
</script>

<style scoped>
.password-generator {
  margin-top: 0.25rem;
}

.toggle {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card);
  color: var(--text);
}

.toggle:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.panel {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  font-size: 0.85rem;
  color: var(--text);
}

.checks label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-direction: row;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.actions button {
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card);
  color: var(--text);
}

.actions button:hover {
  border-color: var(--primary);
}

.preview {
  font-family: ui-monospace, monospace;
  color: var(--text-muted);
}

.error {
  color: var(--danger);
  margin: 0;
  font-size: 0.85rem;
}
</style>
