export function useAudit() {
  return {
    logAction: (_action: string, _metadata?: Record<string, unknown>) => {},
  }
}
