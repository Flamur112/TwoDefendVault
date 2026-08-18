import type { SessionUser } from '../utils/session'

declare module 'h3' {
  interface H3EventContext {
    user?: SessionUser | null
    accessibleVaults?: Array<{
      id: string
      name: string
      description: string | null
      client_id: string | null
      created_at: string
    }>
  }
}

export {}
