<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string | null | undefined
  alt: string
  size?: number
  cacheKey?: string | null
}>(), {
  size: 48,
  cacheKey: null,
})

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const resolvedSrc = computed(() => {
  if (!props.src) return null
  if (!props.cacheKey || !props.src.startsWith('/api/clients/')) return props.src
  const separator = props.src.includes('?') ? '&' : '?'
  return `${props.src}${separator}v=${encodeURIComponent(props.cacheKey)}`
})

const initials = computed(() =>
  props.alt.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase(),
)
</script>

<template>
  <img
    v-if="resolvedSrc"
    :src="resolvedSrc"
    :alt="alt"
    class="client-logo"
    :style="boxStyle"
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
  >
  <span v-else class="client-logo-fallback" :style="boxStyle">{{ initials }}</span>
</template>

<style scoped>
.client-logo,
.client-logo-fallback {
  border-radius: 8px;
  flex-shrink: 0;
  object-fit: cover;
}

.client-logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  font-size: 0.75rem;
}
</style>
