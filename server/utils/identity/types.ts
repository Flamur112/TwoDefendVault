export interface AuthenticatedIdentity {
  provider: 'zoho' | 'microsoft'
  providerSubject: string
  email: string
  displayName?: string
  pictureUrl?: string
}

export interface IdentityExchangeResult {
  identity: AuthenticatedIdentity
  accessToken: string
}

export interface IdentityProvider {
  getAuthorizationUrl(state: string): string
  exchangeCodeForIdentity(code: string): Promise<IdentityExchangeResult>
}
