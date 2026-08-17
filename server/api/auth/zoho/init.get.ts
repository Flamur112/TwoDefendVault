import { getIdentityProvider } from '../../../utils/identity'
import { createSignedOAuthState } from '../../../utils/oauth-state'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  if (!config.sessionSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Session secret not configured' })
  }

  const state = createSignedOAuthState(config.sessionSecret)
  const provider = getIdentityProvider('zoho')
  const url = provider.getAuthorizationUrl(state)

  return sendRedirect(event, url)
})
