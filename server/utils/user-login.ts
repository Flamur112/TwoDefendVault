import { getSupabaseAdmin } from './supabase'

export async function recordUserLogin(userId: string, ipAddress?: string | null): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      last_login_ip: ipAddress ?? null,
    })
    .eq('id', userId)

  if (error) {
    console.error('[auth] failed to record last login:', error.message)
  }
}
