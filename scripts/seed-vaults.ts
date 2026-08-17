/**
 * Grant permissions on existing vaults to org users.
 * Optional: pass vault names as CLI args to create them first.
 * Run: npm run seed:vaults
 * Run: npm run seed:vaults -- "Client A" "Infrastructure"
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

  const vaultNames = process.argv.slice(2).map(name => name.trim()).filter(Boolean)

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

  for (const name of vaultNames) {
    const { data: existing } = await supabase
      .from('vaults')
      .select('id')
      .eq('org_id', org.id)
      .eq('name', name)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase.from('vaults').insert({
        org_id: org.id,
        name,
        created_by: createdBy,
      })
      if (error) {
        console.error(`Failed to create vault ${name}:`, error.message)
        process.exit(1)
      }
      console.log(`Created vault: ${name}`)
    }
    else {
      console.log(`Vault exists: ${name}`)
    }
  }

  const { data: vaults } = await supabase
    .from('vaults')
    .select('id, name')
    .eq('org_id', org.id)

  const { data: users } = await supabase
    .from('users')
    .select('id, role')
    .eq('org_id', org.id)
    .eq('is_active', true)

  if (!vaults?.length) {
    console.log('No vaults in org — create vaults from a client credentials page or pass names as CLI args.')
    return
  }

  if (!users?.length) {
    console.log('No active users to grant permissions')
    return
  }

  for (const vault of vaults) {
    for (const user of users) {
      const access = user.role === 'readonly' ? 'read' : 'write'
      const { error } = await supabase.from('vault_permissions').upsert(
        {
          vault_id: vault.id,
          user_id: user.id,
          access,
          granted_by: createdBy,
        },
        { onConflict: 'vault_id,user_id' },
      )
      if (error) {
        console.error(`Permission failed ${vault.name}/${user.id}:`, error.message)
      }
    }
  }

  console.log(`Granted permissions on ${vaults.length} vault(s) to ${users.length} user(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
