/**
 * Seed example MSP clients and link existing vaults.
 * Run: npm run seed:clients
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SEED_CLIENTS = [
  {
    name: 'Acme Manufacturing',
    slug: 'acme-manufacturing',
    industry: 'Manufacturing',
    website: 'https://acme.example.com',
    phone: '+1 555-0100',
    isFavorite: true,
  },
  {
    name: 'Bright Dental Group',
    slug: 'bright-dental-group',
    industry: 'Healthcare',
    website: 'https://brightdental.example.com',
    phone: '+1 555-0200',
    isFavorite: false,
  },
  {
    name: 'City Law Partners',
    slug: 'city-law-partners',
    industry: 'Legal',
    website: 'https://citylaw.example.com',
    phone: '+1 555-0300',
    isFavorite: true,
  },
]

function loadEnv(): void {
  const envPath = resolve(import.meta.dirname, '../.env')
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

async function main(): Promise<void> {
  loadEnv()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const orgSlug = process.env.ORG_SLUG || 'twodefend'
  const { data: org } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()
  if (!org) {
    console.error('Organization not found')
    process.exit(1)
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', org.id)
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const createdBy = adminUser?.id ?? null

  for (const seed of SEED_CLIENTS) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('slug', seed.slug)
      .maybeSingle()

    let clientId = existing?.id

    if (!clientId) {
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          org_id: org.id,
          name: seed.name,
          slug: seed.slug,
          industry: seed.industry,
          website: seed.website,
          phone: seed.phone,
          is_favorite: seed.isFavorite,
          onboarded_at: '2024-01-15',
          created_by: createdBy,
        })
        .select('id')
        .single()

      if (error || !client) {
        console.error(`Failed to create client ${seed.name}:`, error?.message)
        process.exit(1)
      }

      clientId = client.id
      console.log(`Created client: ${seed.name}`)
    }
    else {
      console.log(`Client exists: ${seed.name}`)
    }
  }

  console.log('Client seed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
