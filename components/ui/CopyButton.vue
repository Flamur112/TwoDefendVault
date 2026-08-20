<template>
  <div class="copy-button">
    <button type="button" :disabled="!value || copying" @click="copy">
      {{ copied ? `Copied (${countdown}s)` : 'Copy' }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ value: string }>()

const toast = useToast()

const CLEAR_SECONDS = 30

const copying = ref(false)
const copied = ref(false)
const countdown = ref(CLEAR_SECONDS)

let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

async function clearClipboard() {
  try {
    await navigator.clipboard.writeText('')
  }
  catch {
    // Clipboard clear is best-effort; not supported everywhere
  }
  copied.value = false
  countdown.value = CLEAR_SECONDS
  clearTimers()
}

async function copy() {
  if (!props.value) return

  copying.value = true
  clearTimers()

  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    toast.show('Copied to clipboard')
    countdown.value = CLEAR_SECONDS

    countdownTimer = setInterval(async () => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        await clearClipboard()
      }
    }, 1000)
  }
  catch {
    copied.value = false
    toast.show('Could not copy to clipboard', 'error')
  }
  finally {
    copying.value = false
  }
}

onUnmounted(() => {
  clearTimers()
})
</script>

<style scoped>
.copy-button button {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--card);
  color: var(--text);
}

.copy-button button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
