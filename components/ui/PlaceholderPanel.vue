<template>
  <div class="placeholder-panel card">
    <p>{{ message || 'Coming soon' }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message?: string }>()
</script>
