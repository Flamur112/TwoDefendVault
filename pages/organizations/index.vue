<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

await navigateTo('/clients', { replace: true })
</script>
