import { auditFromEvent } from '../../utils/audit'
import { requireAuth } from '../../utils/authorize'
import { revokeSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await auditFromEvent(event, {
    user,
    action: 'auth.logout',
    targetType: 'user',
    targetId: user.id,
  })
  await revokeSession(event)
  return { success: true }
})
