import { getSessionUser } from '../utils/session'

const PUBLIC_API_PREFIXES = [
  '/api/auth/zoho/init',
  '/api/auth/callback',
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return

  const isPublic = PUBLIC_API_PREFIXES.some(prefix => path.startsWith(prefix))
  if (isPublic) return

  if (event.context.user) return

  const user = await getSessionUser(event)
  event.context.user = user
})
