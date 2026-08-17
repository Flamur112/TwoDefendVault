import type { SessionUser } from '../utils/session'

declare module 'h3' {
  interface H3EventContext {
    user?: SessionUser | null
  }
}

export {}
