const isProd = process.env.NODE_ENV === 'production'

function normalizeAppUrl(url: string | undefined): string {
  return (url || '').replace(/\/$/, '')
}

const appUrl = normalizeAppUrl(process.env.APP_URL)

export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', 'nuxt-security'],

  // Avoid dev-only Vite race with routeRules + #app-manifest (nuxt/nuxt#33606).
  experimental: {
    appManifest: false,
  },

  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    sessionSecret: process.env.SESSION_SECRET,
    vaultKeyMaterial: process.env.VAULT_KEY_MATERIAL,
    orgSlug: process.env.ORG_SLUG,
    zohoClientId: process.env.ZOHO_CLIENT_ID,
    zohoClientSecret: process.env.ZOHO_CLIENT_SECRET,
    zohoAuthUrl: process.env.ZOHO_AUTH_URL,
    zohoTokenUrl: process.env.ZOHO_TOKEN_URL,
    zohoUserInfoUrl: process.env.ZOHO_USER_INFO_URL,

    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      appUrl,
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_ANON_KEY,
      },
    },
  },

  security: {
    nonce: true,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        // nonce + strict-dynamic required for Nuxt inline hydration scripts
        'script-src': ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'https://*.supabase.co', 'https://accounts.zoho.eu'],
        'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': isProd,
      },
      ...(isProd
        ? {
            strictTransportSecurity: {
              maxAge: 31536000,
              includeSubdomains: true,
            },
          }
        : {}),
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
    },
    rateLimiter: {
      tokensPerInterval: 50,
      interval: 'minute',
    },
  },

  supabase: {
    redirect: false,
  },

  nitro: {
    preset: 'netlify',
    output: {
      dir: '.output',
      publicDir: '.output/public',
    },
  },

  routeRules: {
    '/api/**': { ssr: false },
    '/': { redirect: { to: '/dashboard', statusCode: 302 } },
    '/vault': { redirect: { to: '/clients', statusCode: 301 } },
  },

  compatibilityDate: '2025-07-15',

  css: ['~/assets/css/theme.css'],
})
