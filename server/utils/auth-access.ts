const DEFAULT_ALLOWED_DOMAINS = ['twodefend.com']

export function getAllowedEmailDomains(): string[] {
  const config = useRuntimeConfig()
  const raw = config.allowedEmailDomains || process.env.ALLOWED_EMAIL_DOMAINS || ''

  const parsed = raw
    .split(',')
    .map(part => part.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_DOMAINS
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  if (at === -1) return ''
  return email.slice(at + 1).toLowerCase()
}

export function isAllowedEmailDomain(email: string): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  return getAllowedEmailDomains().includes(domain)
}

export class LoginAccessError extends Error {
  readonly code: 'domain_not_allowed' | 'not_invited'

  constructor(code: 'domain_not_allowed' | 'not_invited', message: string) {
    super(message)
    this.code = code
  }
}

export function assertEmailDomainAllowed(email: string): void {
  if (!isAllowedEmailDomain(email)) {
    const domains = getAllowedEmailDomains().join(', ')
    throw new LoginAccessError(
      'domain_not_allowed',
      `Only @${domains.replace(/, /g, ', @')} email addresses can sign in`,
    )
  }
}
