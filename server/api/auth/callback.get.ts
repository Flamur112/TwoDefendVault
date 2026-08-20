import { getIdentityProvider } from '../../utils/identity'
import { verifySignedOAuthState } from '../../utils/oauth-state'
import { getOrganizationId, LoginAccessError, resolveUserFromIdentity } from '../../utils/provision'
import { auditFromEvent } from '../../utils/audit'
import { createSession } from '../../utils/session'
import { recordUserLogin } from '../../utils/user-login'

async function resolveOrgId(): Promise<string | null> {
  const config = useRuntimeConfig()
  try {
    return await getOrganizationId(config.orgSlug || 'twodefend')
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const oauthError = query.error as string | undefined
  const orgId = await resolveOrgId()

  if (oauthError) {
    await auditFromEvent(event, {
      orgId,
      action: 'auth.login_failed',
      success: false,
      metadata: { reason: oauthError, provider: 'zoho' },
    })
    throw createError({ statusCode: 401, statusMessage: `Zoho authorization denied: ${oauthError}` })
  }

  if (!code || !state) {
    await auditFromEvent(event, {
      orgId,
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
      orgId,
      action: 'auth.login_failed',
      success: false,
      metadata: { reason: 'invalid_state', provider: 'zoho' },
    })
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const provider = getIdentityProvider('zoho')
  const { identity } = await provider.exchangeCodeForIdentity(code)

  let user
  try {
    user = await resolveUserFromIdentity(identity, config.orgSlug || 'twodefend')
  }
  catch (e: unknown) {
    if (e instanceof LoginAccessError) {
      await auditFromEvent(event, {
        orgId,
        action: 'auth.login_failed',
        success: false,
        metadata: {
          reason: e.code,
          email: identity.email,
          provider: 'zoho',
        },
      })
      return sendRedirect(event, `/login?error=${e.code}`)
    }

    const err = e as { statusCode?: number }
    if (err.statusCode === 403) {
      await auditFromEvent(event, {
        orgId,
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
  await recordUserLogin(user.id, ipAddress)

  await auditFromEvent(event, {
    user,
    action: 'auth.login',
    targetType: 'user',
    targetId: user.id,
    metadata: { provider: 'zoho' },
  })

  return sendRedirect(event, '/dashboard')
})
