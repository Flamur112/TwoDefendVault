<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  source: string
}>()

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div v-if="html" class="markdown-body" v-html="html" />
  <p v-else class="text-muted empty">Nothing to preview yet.</p>
</template>

<style scoped>
.empty {
  margin: 0;
  font-size: 0.875rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0.85rem 0 0.45rem;
  line-height: 1.25;
}

.markdown-body :deep(h1) { font-size: 1.25rem; }
.markdown-body :deep(h2) { font-size: 1.05rem; }
.markdown-body :deep(h3) { font-size: 0.95rem; }

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(pre) {
  margin: 0.45rem 0;
  font-size: 0.875rem;
  line-height: 1.55;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.25rem;
}

.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  background: rgba(148, 163, 184, 0.12);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(148, 163, 184, 0.08);
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(a) {
  color: var(--primary);
}

.markdown-body :deep(blockquote) {
  margin: 0.5rem 0;
  padding-left: 0.75rem;
  border-left: 3px solid var(--border);
  color: var(--text-muted);
}

.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.65rem 0;
  border-radius: 0.5rem;
}
</style>
