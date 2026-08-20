<script setup lang="ts">
import { avatarColorForName, initialsForName } from '~/utils/avatar'

const props = withDefaults(defineProps<{
  name: string
  avatarUrl?: string | null
  size?: number
}>(), {
  avatarUrl: null,
  size: 32,
})

const label = computed(() => props.name || '?')
const initials = computed(() => initialsForName(label.value))
const color = computed(() => avatarColorForName(label.value))
const sizePx = computed(() => `${props.size}px`)
</script>

<template>
  <span
    class="user-avatar"
    :style="{ width: sizePx, height: sizePx, background: avatarUrl ? 'transparent' : color }"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="`${label} profile photo`"
      class="photo"
      loading="lazy"
      decoding="async"
    >
    <span v-else class="initials">{{ initials }}</span>
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
}

.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.initials {
  line-height: 1;
}
</style>
