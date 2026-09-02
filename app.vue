<script setup lang="ts">
// A function titleTemplate is only supported through useHead; nuxt.config's
// app.head must stay serialisable.
useHead({
  titleTemplate: titleChunk =>
    titleChunk ? `${titleChunk} · TwoDefend Vault` : 'TwoDefend Vault',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
