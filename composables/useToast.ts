export interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error'
}

export function useToast() {
  const toasts = useState<ToastMessage[]>('app-toasts', () => [])
  let nextId = 1

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(text: string, type: ToastMessage['type'] = 'success', durationMs = 2600) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, text, type }]
    window.setTimeout(() => dismiss(id), durationMs)
  }

  return { toasts, show, dismiss }
}
