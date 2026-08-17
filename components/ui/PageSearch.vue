<template>
  <input
    v-model="searchText"
    type="search"
    class="page-search"
    :class="{ 'page-search--inline': inline }"
    :placeholder="placeholder"
    autocomplete="off"
    :aria-label="placeholder"
  >
</template>

<script setup lang="ts">
defineProps<{
  placeholder?: string
  inline?: boolean
}>()

const appSearch = useAppSearch()

const searchText = computed({
  get: () => appSearch.query.value,
  set: (value: string) => {
    appSearch.query.value = value
  },
})
</script>

<style scoped>
.page-search {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  font-size: 0.9375rem;
  min-height: 42px;
}

.page-search--inline {
  margin-bottom: 0;
}
</style>
