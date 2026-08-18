<script setup lang="ts">
import { useMarkdownEditorHistory } from '~/composables/useMarkdownEditorHistory'
import { imageInputLimitMessage } from '~/utils/image-limits'
import { uploadImageForMarkdown, type ImageUploadStatus } from '~/utils/markdown-images'

const props = defineProps<{
  clientId: string
}>()

const model = defineModel<string>({ default: '' })

const mode = ref<'write' | 'preview'>('write')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const imageError = ref('')
const imageBusy = ref(false)
const imageUploadStatus = ref<ImageUploadStatus | null>(null)
const previewSource = ref(model.value)

const imageUploadLabel = computed(() => {
  switch (imageUploadStatus.value) {
    case 'checking':
      return 'Checking image…'
    case 'compressing':
      return 'Compressing image…'
    case 'uploading':
      return 'Uploading image…'
    default:
      return 'Uploading image…'
  }
})

const imageLimitHint = imageInputLimitMessage()

const history = useMarkdownEditorHistory(model)
history.reset(model.value)

let typingTimer: ReturnType<typeof setTimeout> | undefined
let previewTimer: ReturnType<typeof setTimeout> | undefined

function flushHistorySnapshot() {
  clearTimeout(typingTimer)
  history.pushSnapshot()
}

function scheduleHistorySnapshot() {
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => history.pushSnapshot(), 200)
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    previewSource.value = model.value
  }, 180)
}

watch(model, () => {
  scheduleHistorySnapshot()
  if (mode.value === 'preview') schedulePreview()
})

watch(mode, (value) => {
  if (value === 'preview') previewSource.value = model.value
})

type FormatAction
  = | 'bold'
    | 'italic'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'bullet'
    | 'numbered'
    | 'link'
    | 'code'
    | 'codeblock'
    | 'quote'

function focusTextarea() {
  textareaRef.value?.focus()
}

function replaceSelection(next: string, selectStart: number, selectEnd: number) {
  model.value = next
  nextTick(() => {
    focusTextarea()
    textareaRef.value?.setSelectionRange(selectStart, selectEnd)
  })
}

function insertAtCursor(text: string, selectStart?: number, selectEnd?: number) {
  const el = textareaRef.value
  if (!el) {
    model.value += text
    return
  }

  const start = el.selectionStart
  const end = el.selectionEnd
  const next = model.value.slice(0, start) + text + model.value.slice(end)
  const cursorStart = selectStart ?? start + text.length
  const cursorEnd = selectEnd ?? cursorStart
  replaceSelection(next, cursorStart, cursorEnd)
}

function wrapInline(before: string, after: string, placeholder: string) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = model.value.slice(start, end) || placeholder
  const next = model.value.slice(0, start) + before + selected + after + model.value.slice(end)
  const cursorStart = start + before.length
  const cursorEnd = cursorStart + selected.length
  replaceSelection(next, cursorStart, cursorEnd)
}

function stripLinePrefix(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/^\d+\.\s+/, '')
}

function applyLinePrefix(prefix: string, placeholder: string) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const value = model.value

  let lineStart = value.lastIndexOf('\n', start - 1) + 1
  if (lineStart < 0) lineStart = 0
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length

  const block = value.slice(lineStart, lineEnd)
  const lines = block ? block.split('\n') : ['']
  const formatted = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed && lines.length === 1) return `${prefix}${placeholder}`
    if (!trimmed) return line
    return `${prefix}${stripLinePrefix(line).trim()}`
  })

  const nextBlock = formatted.join('\n')
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd)
  replaceSelection(next, lineStart, lineStart + nextBlock.length)
}

function applyNumberedList() {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const value = model.value

  let lineStart = value.lastIndexOf('\n', start - 1) + 1
  if (lineStart < 0) lineStart = 0
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length

  const block = value.slice(lineStart, lineEnd)
  const lines = block ? block.split('\n') : ['']
  const formatted = lines.map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed && lines.length === 1) return '1. Item'
    if (!trimmed) return line
    return `${index + 1}. ${stripLinePrefix(line).trim()}`
  })

  const nextBlock = formatted.join('\n')
  const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd)
  replaceSelection(next, lineStart, lineStart + nextBlock.length)
}

function applyCodeBlock() {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = model.value.slice(start, end) || 'code'
  const needsLeadingNewline = start > 0 && model.value[start - 1] !== '\n'
  const needsTrailingNewline = end < model.value.length && model.value[end] !== '\n'
  const block = `${needsLeadingNewline ? '\n' : ''}\`\`\`\n${selected}\n\`\`\`${needsTrailingNewline ? '\n' : ''}`
  const next = model.value.slice(0, start) + block + model.value.slice(end)
  const cursorStart = start + block.indexOf(selected)
  replaceSelection(next, cursorStart, cursorStart + selected.length)
}

function runFormat(action: FormatAction) {
  focusTextarea()
  switch (action) {
    case 'bold':
      wrapInline('**', '**', 'bold text')
      break
    case 'italic':
      wrapInline('*', '*', 'italic text')
      break
    case 'h1':
      applyLinePrefix('# ', 'Heading')
      break
    case 'h2':
      applyLinePrefix('## ', 'Heading')
      break
    case 'h3':
      applyLinePrefix('### ', 'Heading')
      break
    case 'bullet':
      applyLinePrefix('- ', 'Item')
      break
    case 'numbered':
      applyNumberedList()
      break
    case 'link':
      wrapInline('[', '](https://example.com)', 'link text')
      break
    case 'code':
      wrapInline('`', '`', 'code')
      break
    case 'codeblock':
      applyCodeBlock()
      break
    case 'quote':
      applyLinePrefix('> ', 'Quote')
      break
  }
}

function applyFormat(action: FormatAction) {
  mode.value = 'write'
  imageError.value = ''
  history.runEdit(() => runFormat(action))
}

function onKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return

  const key = event.key.toLowerCase()

  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    flushHistorySnapshot()
    history.undo()
    return
  }

  if ((key === 'z' && event.shiftKey) || key === 'y') {
    event.preventDefault()
    flushHistorySnapshot()
    history.redo()
    return
  }

  if (key === 'b') {
    event.preventDefault()
    applyFormat('bold')
    return
  }

  if (key === 'i') {
    event.preventDefault()
    applyFormat('italic')
    return
  }

  if (key === 'k') {
    event.preventDefault()
    applyFormat('link')
  }
}

function openImagePicker() {
  imageError.value = ''
  fileInputRef.value?.click()
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  imageBusy.value = true
  imageError.value = ''
  imageUploadStatus.value = 'checking'
  mode.value = 'write'

  try {
    const markdown = await uploadImageForMarkdown(props.clientId, file, (status) => {
      imageUploadStatus.value = status
    })
    history.runEdit(() => insertAtCursor(markdown))
  }
  catch (error: unknown) {
    imageError.value = error instanceof Error ? error.message : 'Could not attach image.'
  }
  finally {
    imageBusy.value = false
    imageUploadStatus.value = null
  }
}

const toolbarButtons: { action: FormatAction, label: string, title: string }[] = [
  { action: 'bold', label: 'B', title: 'Bold (Ctrl+B)' },
  { action: 'italic', label: 'I', title: 'Italic (Ctrl+I)' },
  { action: 'h1', label: 'H1', title: 'Large heading (#)' },
  { action: 'h2', label: 'H2', title: 'Medium heading (##)' },
  { action: 'h3', label: 'H3', title: 'Small heading (###)' },
  { action: 'bullet', label: 'List', title: 'Bullet list' },
  { action: 'numbered', label: '1.', title: 'Numbered list' },
  { action: 'link', label: 'Link', title: 'Link (Ctrl+K)' },
  { action: 'code', label: '`', title: 'Inline code' },
  { action: 'codeblock', label: '```', title: 'Code block' },
  { action: 'quote', label: 'Quote', title: 'Block quote' },
]
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-toolbar">
      <div class="editor-tabs">
        <button type="button" class="tab" :class="{ active: mode === 'write' }" @click="mode = 'write'">
          Write
        </button>
        <button type="button" class="tab" :class="{ active: mode === 'preview' }" @click="mode = 'preview'">
          Preview
        </button>
      </div>
      <div v-show="mode === 'write'" class="format-buttons">
        <button
          v-for="button in toolbarButtons"
          :key="button.action"
          type="button"
          class="format-btn"
          :title="button.title"
          @mousedown.prevent
          @click="applyFormat(button.action)"
        >
          {{ button.label }}
        </button>
        <button
          type="button"
          class="format-btn"
          :class="{ 'format-btn--busy': imageBusy }"
          title="Attach image"
          :disabled="imageBusy"
          @mousedown.prevent
          @click="openImagePicker"
        >
          <span v-if="imageBusy" class="btn-spinner" aria-hidden="true" />
          {{ imageBusy ? 'Uploading…' : 'Image' }}
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onImageSelected"
        >
      </div>
    </div>

    <textarea
      v-show="mode === 'write'"
      ref="textareaRef"
      v-model="model"
      class="editor-input"
      rows="14"
      placeholder="Start writing your guide here."
      @keydown="onKeydown"
      @blur="flushHistorySnapshot"
    />

    <div v-show="mode === 'preview'" class="editor-preview card">
      <UiMarkdownContent :source="previewSource" />
    </div>

    <div v-if="imageBusy" class="upload-status" role="status" aria-live="polite">
      <span class="upload-spinner" aria-hidden="true" />
      <span>{{ imageUploadLabel }}</span>
    </div>
    <p v-else class="upload-hint text-muted">{{ imageLimitHint }}</p>

    <p v-if="imageError" class="editor-error">{{ imageError }}</p>
  </div>
</template>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
}

.editor-tabs {
  display: inline-flex;
  gap: 0.35rem;
}

.tab {
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  cursor: pointer;
}

.tab.active {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--text);
}

.format-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.format-btn {
  min-width: 2rem;
  padding: 0.25rem 0.45rem;
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.format-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--text);
  background: var(--primary-soft);
}

.format-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.format-btn--busy {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-spinner,
.upload-spinner {
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.upload-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--primary);
  border-radius: 0.4rem;
  background: var(--primary-soft);
  color: var(--text);
  font-size: 0.8125rem;
}

.upload-hint {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.4;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.editor-input {
  width: 100%;
  min-height: 16rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.editor-preview {
  min-height: 16rem;
  padding: 0.75rem;
}

.editor-error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
