/** Shared retention windows shown in UI and used by server purge jobs. */
export const ACTIVITY_RETENTION_DAYS = 14
export const AUDIT_RETENTION_DAYS = 365
export const SESSION_RETENTION_DAYS = 30

export function retentionCutoffIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function activityCutoffIso(): string {
  return retentionCutoffIso(ACTIVITY_RETENTION_DAYS)
}

export function auditCutoffIso(): string {
  return retentionCutoffIso(AUDIT_RETENTION_DAYS)
}

export function sessionCutoffIso(): string {
  return retentionCutoffIso(SESSION_RETENTION_DAYS)
}
