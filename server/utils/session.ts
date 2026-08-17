import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { getSupabaseAdmin } from './supabase'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './auth-constants'

export interface SessionUser {
  id: string
  orgId: string
  email: string
  displayName: string | null
  role: 'admin' | 'member' | 'readonly'
}

const LAST_SEEN_INTERVAL_MS = 5 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function cookieOptions(event: H3Event, maxAge: number) {
  const secure = getRequestURL(event).protocol === 'https:'
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export async function createSession(
  event: H3Event,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<string> {
  const token = generateSessionToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString()

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    expires_at: expiresAt,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create session' })
  }

  setCookie(event, SESSION_COOKIE, token, cookieOptions(event, SESSION_MAX_AGE_SECONDS))
  return token
}

export async function validateSession(token: string): Promise<SessionUser | null> {
  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      id,
      expires_at,
      revoked_at,
      last_seen_at,
      users!inner(id, org_id, email, display_name, role, is_active)
    `)
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (sessionError || !session) return null
  if (session.revoked_at) return null
  if (new Date(session.expires_at) <= new Date()) return null

  const userRow = Array.isArray(session.users) ? session.users[0] : session.users
  if (!userRow?.is_active) return null

  const lastSeen = session.last_seen_at ? new Date(session.last_seen_at).getTime() : 0
  if (Date.now() - lastSeen > LAST_SEEN_INTERVAL_MS) {
    void supabase
      .from('sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.id)
  }

  return {
    id: userRow.id,
    orgId: userRow.org_id,
    email: userRow.email,
    displayName: userRow.display_name,
    role: userRow.role as SessionUser['role'],
  }
}

export async function revokeSession(event: H3Event, token?: string): Promise<void> {
  const sessionToken = token ?? getCookie(event, SESSION_COOKIE)
  if (!sessionToken) return

  const tokenHash = hashToken(sessionToken)
  const supabase = getSupabaseAdmin()

  await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)

  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null)
}

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE)
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  if (event.context.user) {
    return event.context.user as SessionUser
  }

  const token = getSessionToken(event)
  if (!token) return null
  return validateSession(token)
}
