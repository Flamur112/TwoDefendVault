import { getIdentityProvider } from '../../utils/identity'
import { verifySignedOAuthState } from '../../utils/oauth-state'
import { resolveUserFromIdentity } from '../../utils/provision'
import { auditFromEvent } from '../../utils/audit'
import { createSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const oauthError = query.error as string | undefined

  if (oauthError) {
    await auditFromEvent(event, {
      action: 'auth.login_failed',
      success: false,
      metadata: { reason: oauthError, provider: 'zoho' },
    })
    throw createError({ statusCode: 401, statusMessage: `Zoho authorization denied: ${oauthError}` })
  }

  if (!code || !state) {
    await auditFromEvent(event, {
      action: 'auth.login_failed',
      success: false,
      metadata: { reason: 'missing_code_or_state', provider: 'zoho' },
    })
    throw createError({ statusCode: 400, statusMessage: 'Missing OAuth code or state' })
  }

  const config = useRuntimeConfig()
  if (!config.sessionSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Session secret not configured' })
  }

  if (!verifySignedOAuthState(state, config.sessionSecret)) {
    await auditFromEvent(event, {
      action: 'auth.login_failed',
      success: false,
      metadata: { reason: 'invalid_state', provider: 'zoho' },
    })
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const provider = getIdentityProvider('zoho')
  const identity = await provider.exchangeCodeForIdentity(code)

  let user
  try {
    user = await resolveUserFromIdentity(identity, config.orgSlug || 'twodefend')
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number }
    if (err.statusCode === 403) {
      await auditFromEvent(event, {
        action: 'auth.login_failed',
        success: false,
        metadata: { reason: 'deactivated', email: identity.email, provider: 'zoho' },
      })
      return sendRedirect(event, '/login?error=deactivated')
    }
    throw e
  }

  const ipAddress = getRequestIP(event, { xForwardedFor: true })
  const userAgent = getHeader(event, 'user-agent')

  await createSession(event, user.id, ipAddress, userAgent)

  await auditFromEvent(event, {
    user,
    action: 'auth.login',
    targetType: 'user',
    targetId: user.id,
    metadata: { provider: 'zoho' },
  })

  return sendRedirect(event, '/dashboard')
})
