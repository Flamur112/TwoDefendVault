export interface AuthenticatedIdentity {
  provider: 'zoho' | 'microsoft'
  providerSubject: string
  email: string
  displayName?: string
}

export interface IdentityProvider {
  getAuthorizationUrl(state: string): string
  exchangeCodeForIdentity(code: string): Promise<AuthenticatedIdentity>
}
