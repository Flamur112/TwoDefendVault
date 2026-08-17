import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const config = useRuntimeConfig()

  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 503, statusMessage: 'Supabase not configured' })
  }

  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
