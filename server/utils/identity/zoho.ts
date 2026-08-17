import type { AuthenticatedIdentity, IdentityProvider } from './types'
import { getOAuthCallbackUrl } from '../app-url'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  error?: string
}

interface ZohoUserInfo {
  sub?: string
  ZUID?: string
  email?: string
  Email?: string
  name?: string
  display_name?: string
  Display_Name?: string
  first_name?: string
  last_name?: string
}

function getZohoConfig() {
  const config = useRuntimeConfig()
  if (!config.zohoClientId || !config.zohoClientSecret
    || !config.zohoAuthUrl || !config.zohoTokenUrl || !config.zohoUserInfoUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Zoho OAuth not configured' })
  }
  return config
}

function extractEmail(info: ZohoUserInfo): string {
  const email = info.email ?? info.Email
  if (!email) {
    throw createError({ statusCode: 502, statusMessage: 'Zoho account has no email address' })
  }
  return email.toLowerCase()
}

function extractSubject(info: ZohoUserInfo): string {
  const subject = info.sub ?? info.ZUID
  if (!subject) {
    throw createError({ statusCode: 502, statusMessage: 'Zoho user info missing subject identifier' })
  }
  return String(subject)
}

function extractDisplayName(info: ZohoUserInfo): string | undefined {
  if (info.display_name) return info.display_name
  if (info.Display_Name) return info.Display_Name
  if (info.name) return info.name
  const parts = [info.first_name, info.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}

export const zohoIdentityProvider: IdentityProvider = {
  getAuthorizationUrl(state: string): string {
    const config = getZohoConfig()
    const params = new URLSearchParams({
      client_id: config.zohoClientId,
      response_type: 'code',
      redirect_uri: getOAuthCallbackUrl(),
      scope: 'AaaServer.profile.READ,email',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `${config.zohoAuthUrl}?${params.toString()}`
  },

  async exchangeCodeForIdentity(code: string): Promise<AuthenticatedIdentity> {
    const config = getZohoConfig()

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.zohoClientId,
      client_secret: config.zohoClientSecret,
      redirect_uri: getOAuthCallbackUrl(),
      code,
    })

    const tokenResponse = await $fetch<ZohoTokenResponse>(config.zohoTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })

    if (tokenResponse.error || !tokenResponse.access_token) {
      throw createError({ statusCode: 401, statusMessage: 'Zoho token exchange failed' })
    }

    const userInfo = await $fetch<ZohoUserInfo>(config.zohoUserInfoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${tokenResponse.access_token}` },
    })

    return {
      provider: 'zoho',
      providerSubject: extractSubject(userInfo),
      email: extractEmail(userInfo),
      displayName: extractDisplayName(userInfo),
    }
  },
}
