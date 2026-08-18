import { hashSeed, localDateKey } from '~/utils/daily-seed'

/** Rare, subtle login moments — client-side only. */
export type LoginDelightType = 'confetti' | 'sparkle' | 'glow'

/** ~2% of days get any delight; same user + day → same variant. */
export function getLoginDelight(userSeed: string, date = new Date()): LoginDelightType | null {
  const seed = `${userSeed}:delight:${localDateKey(date)}`
  const hash = hashSeed(seed)

  if (hash % 100 >= 2) return null

  const variant = hash % 3
  if (variant === 0) return 'confetti'
  if (variant === 1) return 'sparkle'
  return 'glow'
}

export function loginDelightSessionKey(userSeed: string, date = new Date()): string {
  return `vault-login-delight:${userSeed}:${localDateKey(date)}`
}

export const LOGIN_DELIGHT_COLORS = ['#a78bfa', '#6b8cff', '#2dd4bf', '#c4b5fd', '#99f6e4'] as const

export function confettiPieceStyle(index: number, userSeed: string): Record<string, string> {
  const hash = hashSeed(`${userSeed}:piece:${index}`)
  const left = 8 + (hash % 84)
  const delay = (hash % 400) / 1000
  const duration = 1.8 + (hash % 500) / 1000
  const color = LOGIN_DELIGHT_COLORS[hash % LOGIN_DELIGHT_COLORS.length]
  const size = 4 + (hash % 4)

  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    backgroundColor: color,
    width: `${size}px`,
    height: `${size * 1.4}px`,
  }
}
