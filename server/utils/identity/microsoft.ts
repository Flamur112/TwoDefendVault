import type { AuthenticatedIdentity, IdentityProvider } from './types'

export const microsoftIdentityProvider: IdentityProvider = {
  getAuthorizationUrl(_state: string): string {
    throw createError({ statusCode: 501, statusMessage: 'Microsoft Entra ID not implemented' })
  },

  async exchangeCodeForIdentity(_code: string): Promise<AuthenticatedIdentity> {
    throw createError({ statusCode: 501, statusMessage: 'Microsoft Entra ID not implemented' })
  },
}
