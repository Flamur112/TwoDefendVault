import { auditFromEvent } from '../../utils/audit'
import { getSessionUser, revokeSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)

  if (user) {
    await auditFromEvent(event, {
      user,
      action: 'auth.logout',
      targetType: 'user',
      targetId: user.id,
    })
  }

  await revokeSession(event)
  return { success: true }
})
