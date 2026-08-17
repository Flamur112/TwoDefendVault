const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

/** Excludes ambiguous characters: 0/O, 1/l/I, etc. */
const UPPERCASE_UNAMBIGUOUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE_UNAMBIGUOUS = 'abcdefghijkmnopqrstuvwxyz'
const NUMBERS_UNAMBIGUOUS = '23456789'
const SYMBOLS_UNAMBIGUOUS = '!@#$%^&*-_=+'

export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

function pickCharset(enabled: boolean, full: string, unambiguous: string, excludeAmbiguous: boolean): string {
  if (!enabled) return ''
  return excludeAmbiguous ? unambiguous : full
}

export function generatePassword(options: PasswordOptions): string {
  const length = Math.max(4, Math.min(128, Math.floor(options.length)))

  const pools = [
    pickCharset(options.uppercase, UPPERCASE, UPPERCASE_UNAMBIGUOUS, options.excludeAmbiguous),
    pickCharset(options.lowercase, LOWERCASE, LOWERCASE_UNAMBIGUOUS, options.excludeAmbiguous),
    pickCharset(options.numbers, NUMBERS, NUMBERS_UNAMBIGUOUS, options.excludeAmbiguous),
    pickCharset(options.symbols, SYMBOLS, SYMBOLS_UNAMBIGUOUS, options.excludeAmbiguous),
  ].filter(Boolean)

  if (pools.length === 0) {
    throw new Error('At least one character set must be selected')
  }

  const charset = pools.join('')
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  const chars: string[] = Array.from(bytes, byte => charset[byte % charset.length]!)

  // Ensure at least one character from each enabled pool
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]!
    const byte = crypto.getRandomValues(new Uint8Array(1))[0]!
    chars[i] = pool[byte % pool.length]!
  }

  // Fisher–Yates shuffle using crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint8Array(1))[0]! % (i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  return chars.join('')
}
