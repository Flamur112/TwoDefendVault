import { Secret, TOTP, URI } from 'otpauth'

const DEFAULT_PERIOD = 30

/** Normalize base32 or otpauth:// URI to raw base32 secret */
export function parseTotpSecret(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('TOTP secret is empty')

  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    const parsed = URI.parse(trimmed)
    if (parsed instanceof TOTP && parsed.secret) {
      return parsed.secret.base32
    }
    throw new Error('Invalid otpauth URI')
  }

  return trimmed.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
}

export function createTotp(secretInput: string): TOTP {
  const secret = Secret.fromBase32(parseTotpSecret(secretInput))
  return new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: DEFAULT_PERIOD,
    secret,
  })
}

export function generateTotpCode(secretInput: string, timestampMs?: number): string {
  const totp = createTotp(secretInput)
  return totp.generate(timestampMs !== undefined ? { timestamp: timestampMs } : undefined)
}

/** Seconds until the current code expires (1..period) */
export function totpSecondsRemaining(period = DEFAULT_PERIOD, nowMs = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return period - (nowSec % period)
}

export function totpPeriod(period = DEFAULT_PERIOD): number {
  return period
}
