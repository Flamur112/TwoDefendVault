<template>
  <div class="secret-field">
    <input
      v-if="!readonly"
      :type="revealed ? 'text' : 'password'"
      :value="modelValue"
      class="input"
      autocomplete="off"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <code v-else class="value">{{ revealed ? modelValue : maskedDisplay }}</code>

    <button type="button" class="reveal" @click="toggleReveal">
      {{ revealed ? (maskCountdown > 0 ? `Hide (${maskCountdown}s)` : 'Hide') : 'Reveal' }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
}>(), {
  readonly: false,
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const AUTO_MASK_SECONDS = 30

const revealed = ref(false)
const maskCountdown = ref(0)

let maskTimer: ReturnType<typeof setInterval> | null = null

const maskedDisplay = computed(() =>
  props.modelValue ? '•'.repeat(Math.min(props.modelValue.length, 24)) : '',
)

function clearMaskTimer() {
  if (maskTimer) {
    clearInterval(maskTimer)
    maskTimer = null
  }
  maskCountdown.value = 0
}

function maskNow() {
  revealed.value = false
  clearMaskTimer()
}

function startMaskTimer() {
  clearMaskTimer()
  maskCountdown.value = AUTO_MASK_SECONDS
  maskTimer = setInterval(() => {
    maskCountdown.value -= 1
    if (maskCountdown.value <= 0) {
      maskNow()
    }
  }, 1000)
}

function toggleReveal() {
  if (revealed.value) {
    maskNow()
    return
  }
  revealed.value = true
  startMaskTimer()
}

watch(() => props.modelValue, () => {
  if (revealed.value) {
    startMaskTimer()
  }
})

onUnmounted(clearMaskTimer)
</script>

<style scoped>
.secret-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input,
.value {
  flex: 1;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.input {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  background: var(--card);
  color: var(--text);
}

.value {
  display: block;
  padding: 0.25rem 0;
  color: var(--text);
}

.reveal {
  flex-shrink: 0;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card);
  color: var(--text);
}

.reveal:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>
