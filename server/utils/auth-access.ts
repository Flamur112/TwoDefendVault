export class LoginAccessError extends Error {
  readonly code: 'domain_not_allowed' | 'not_invited'

  constructor(code: 'domain_not_allowed' | 'not_invited', message: string) {
    super(message)
    this.code = code
  }
}
