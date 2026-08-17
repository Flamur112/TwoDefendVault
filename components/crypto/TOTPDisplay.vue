<template>
  <div class="totp-display">
    <div class="code-row">
      <span class="code" aria-live="polite">{{ code || '------' }}</span>
      <UiCopyButton v-if="code" :value="code" />
    </div>
    <div class="countdown-row">
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      <span class="countdown text-muted">{{ remaining }}s</span>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { generateTotpCode, totpPeriod, totpSecondsRemaining } from '~/utils/totp'

const props = defineProps<{ secret: string }>()

const code = ref('')
const remaining = ref(30)
const progressPct = ref(100)
const error = ref('')

const period = totpPeriod()
let timer: ReturnType<typeof setInterval> | null = null

function refresh() {
  if (!props.secret) {
    code.value = ''
    error.value = ''
    return
  }

  try {
    code.value = generateTotpCode(props.secret)
    remaining.value = totpSecondsRemaining(period)
    progressPct.value = (remaining.value / period) * 100
    error.value = ''
  }
  catch (e: unknown) {
    code.value = ''
    error.value = e instanceof Error ? e.message : 'Invalid TOTP secret'
  }
}

function startTimer() {
  stopTimer()
  refresh()
  // One tick per second — only while this component is mounted
  timer = setInterval(refresh, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(() => props.secret, startTimer, { immediate: true })

onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<style scoped>
.totp-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.code-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.code {
  font-family: ui-monospace, monospace;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--primary);
}

.countdown-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.bar-track {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--primary);
  transition: width 1s linear;
}

.countdown {
  font-size: 0.75rem;
  min-width: 2rem;
  text-align: right;
}

.error {
  color: var(--danger);
  font-size: 0.8125rem;
  margin: 0;
}
</style>
