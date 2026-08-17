/** Base app URL from APP_URL (no trailing slash). Used for OAuth redirect URIs. */
export function getAppUrl(): string {
  const config = useRuntimeConfig()
  const fromPublic = config.public.appUrl as string | undefined
  const base = (fromPublic || '').replace(/\/$/, '')
  if (!base) {
    throw createError({ statusCode: 503, statusMessage: 'APP_URL not configured' })
  }
  return base
}

export function getOAuthCallbackUrl(): string {
  return `${getAppUrl()}/api/auth/callback`
}
