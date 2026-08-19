<script setup lang="ts">
import type { ClientSectionRecord } from '~/types/client'
import { parseDocumentAttachments } from '~/utils/document-attachments'
import { documentExcerpt, getDocumentType } from '~/utils/documents'
import { formatProjectWhen } from '~/utils/projects'

const props = defineProps<{
  record: ClientSectionRecord
  clientId: string
  canWrite: boolean
}>()

defineEmits<{
  delete: []
}>()

const attachmentCount = computed(() => parseDocumentAttachments(props.record.metadata).length)
</script>

<template>
  <article class="card document-card">
    <div class="card-summary">
      <NuxtLink :to="`/clients/${clientId}/documents/${record.id}`" class="summary-link">
        <span class="chevron" aria-hidden="true">›</span>
        <span class="summary-copy">
          <span class="summary-title-row">
            <strong class="summary-title">{{ record.title }}</strong>
            <span class="type-badge">{{ getDocumentType(record.metadata) }}</span>
          </span>
          <span class="summary-meta text-muted">
            Updated {{ formatProjectWhen(record.updatedAt) }}
            <span v-if="attachmentCount > 0"> · {{ attachmentCount }} file{{ attachmentCount === 1 ? '' : 's' }}</span>
            <span v-if="record.notes?.trim()"> · {{ documentExcerpt(record.notes) }}</span>
            <span v-else-if="!attachmentCount"> · {{ documentExcerpt(record.notes) }}</span>
          </span>
        </span>
        <span class="summary-action-label">Open</span>
      </NuxtLink>
      <div v-if="canWrite" class="summary-actions">
        <NuxtLink :to="`/clients/${clientId}/documents/${record.id}`" class="btn btn-sm">Open</NuxtLink>
        <button type="button" class="btn btn-sm btn-danger" @click.stop="$emit('delete')">Delete</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.document-card {
  padding-bottom: 0.65rem;
}

.card-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.summary-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0;
  color: inherit;
  text-decoration: none;
}

.summary-link:hover .summary-title {
  color: var(--primary);
}

.summary-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.summary-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.type-badge {
  display: inline-block;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  background: rgba(107, 140, 255, 0.14);
  color: var(--primary);
  font-size: 0.6875rem;
  font-weight: 600;
}

.summary-meta {
  font-size: 0.75rem;
  line-height: 1.35;
}

.summary-action-label {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: var(--text-muted);
  padding-top: 0.15rem;
}

.chevron {
  display: inline-block;
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--text-muted);
}

.summary-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-sm {
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
}
</style>
