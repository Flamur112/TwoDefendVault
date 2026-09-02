import {
  ACTIVITY_RETENTION_DAYS,
  AUDIT_RETENTION_DAYS,
  SESSION_RETENTION_DAYS,
  activityCutoffIso,
  auditCutoffIso,
  sessionCutoffIso,
} from '../../utils/retention'
import { getSupabaseAdmin } from './supabase'

let lastPurgeAt = 0
const PURGE_INTERVAL_MS = 60 * 60 * 1000

export interface RetentionPurgeResult {
  activityDeleted: boolean
  auditDeleted: boolean
  sessionsDeleted: boolean
}

export async function runRetentionPurge(): Promise<RetentionPurgeResult> {
  const supabase = getSupabaseAdmin()
  const activityBefore = activityCutoffIso()
  const auditBefore = auditCutoffIso()
  const sessionBefore = sessionCutoffIso()

  const [activityRes, auditRes, expiredSessionsRes, revokedSessionsRes] = await Promise.all([
    supabase.from('client_activity').delete().lt('created_at', activityBefore),
    supabase.from('audit_logs').delete().lt('created_at', auditBefore),
    supabase.from('sessions').delete().lt('expires_at', sessionBefore),
    supabase.from('sessions').delete().not('revoked_at', 'is', null).lt('revoked_at', sessionBefore),
  ])

  if (activityRes.error) {
    console.error('[retention] activity purge failed:', activityRes.error.message)
  }
  if (auditRes.error) {
    console.error('[retention] audit purge failed:', auditRes.error.message)
  }
  if (expiredSessionsRes.error) {
    console.error('[retention] expired session purge failed:', expiredSessionsRes.error.message)
  }
  if (revokedSessionsRes.error) {
    console.error('[retention] revoked session purge failed:', revokedSessionsRes.error.message)
  }

  return {
    activityDeleted: !activityRes.error,
    auditDeleted: !auditRes.error,
    sessionsDeleted: !expiredSessionsRes.error && !revokedSessionsRes.error,
  }
}

/** Throttled background purge; safe to call from hot read paths. */
export function maybeRunRetentionPurge(): void {
  if (Date.now() - lastPurgeAt < PURGE_INTERVAL_MS) return
  lastPurgeAt = Date.now()
  runRetentionPurge().catch((err) => {
    console.error('[retention] purge failed:', err)
  })
}

export function verifyCronSecret(event: Parameters<typeof getHeader>[0]): void {
  const config = useRuntimeConfig()
  const secret = config.cronSecret || process.env.CRON_SECRET
  if (!secret) {
    throw createError({ statusCode: 503, statusMessage: 'Retention cron not configured' })
  }

  const provided = getHeader(event, 'x-cron-secret')
  if (provided !== secret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
