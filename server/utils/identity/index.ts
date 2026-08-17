import type { IdentityProvider } from './types'
import { microsoftIdentityProvider } from './microsoft'
import { zohoIdentityProvider } from './zoho'

export function getIdentityProvider(provider: 'zoho' | 'microsoft'): IdentityProvider {
  if (provider === 'zoho') return zohoIdentityProvider
  if (provider === 'microsoft') return microsoftIdentityProvider
  throw createError({ statusCode: 400, statusMessage: 'Unknown identity provider' })
}
