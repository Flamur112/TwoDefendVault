import { createHash } from 'node:crypto'
import { requireAuth } from '../../utils/authorize'
import { auditFromEvent } from '../../utils/audit'
import { getSupabaseAdmin } from '../../utils/supabase'
import { getSessionToken } from '../../utils/session'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const currentToken = getSessionToken(event)
  if (!currentToken) {
    throw createError({ statusCode: 400, statusMessage: 'No active session' })
  }

  const currentHash = hashToken(currentToken)
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .neq('token_hash', currentHash)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to revoke sessions' })
  }

  await auditFromEvent(event, {
    user,
    action: 'auth.sessions_revoked',
    targetType: 'user',
    targetId: user.id,
    metadata: { scope: 'other_devices' },
  })

  return { ok: true }
})
