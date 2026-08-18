export function useMarkdownEditorHistory(source: Ref<string>, limit = 80) {
  const entries = ref<string[]>([])
  const index = ref(0)
  let applying = false

  function reset(value = source.value) {
    entries.value = [value]
    index.value = 0
  }

  function canUndo() {
    return index.value > 0
  }

  function canRedo() {
    return index.value < entries.value.length - 1
  }

  function pushSnapshot() {
    if (applying) return

    const value = source.value
    if (entries.value[index.value] === value) return

    entries.value = entries.value.slice(0, index.value + 1)
    entries.value.push(value)

    if (entries.value.length > limit) {
      entries.value.shift()
    }
    else {
      index.value++
    }
  }

  function undo() {
    if (!canUndo()) return false
    index.value--
    applying = true
    source.value = entries.value[index.value] ?? ''
    applying = false
    return true
  }

  function redo() {
    if (!canRedo()) return false
    index.value++
    applying = true
    source.value = entries.value[index.value] ?? ''
    applying = false
    return true
  }

  function runEdit(edit: () => void) {
    pushSnapshot()
    edit()
    pushSnapshot()
  }

  return {
    reset,
    pushSnapshot,
    undo,
    redo,
    runEdit,
  }
}
