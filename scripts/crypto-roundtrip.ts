/**
 * Phase 4 round-trip test: encrypt → Supabase → fetch → decrypt
 * Run: npm run test:crypto
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { deriveLegacyUserVaultKeyMaterial, deriveOrgVaultKeyMaterial } from '../server/utils/vault-key.ts'
import {
  decryptPayload,
  deriveKey,
  encryptPayload,
  hexToArrayBuffer,
} from '../utils/crypto.ts'

function loadEnv(): void {
  const envPath = resolve(import.meta.dirname, '../.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

const TEST_PLAINTEXT = 'phase4-roundtrip-test-secret-7f3a9c2e'
const TEST_ITEM_NAME = '__phase4_crypto_test__'

async function main(): Promise<void> {
  loadEnv()

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vaultKeyMaterial = process.env.VAULT_KEY_MATERIAL
  const orgSlug = process.env.ORG_SLUG || 'twodefend'

  if (!supabaseUrl || !serviceKey || !vaultKeyMaterial) {
    console.error('FAIL: Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or VAULT_KEY_MATERIAL')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    console.error('FAIL: Organization not found — run seed migration')
    process.exit(1)
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!user) {
    console.error('FAIL: No active user found for round-trip test')
    process.exit(1)
  }

  let vaultId: string
  const { data: existingVault } = await supabase
    .from('vaults')
    .select('id')
    .eq('org_id', org.id)
    .eq('name', 'Phase 4 Test Vault')
    .maybeSingle()

  if (existingVault) {
    vaultId = existingVault.id
  }
  else {
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .insert({
        org_id: org.id,
        name: 'Phase 4 Test Vault',
        description: 'Temporary vault for Phase 4 crypto round-trip (no real credentials)',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (vaultError || !vault) {
      console.error('FAIL: Could not create test vault', vaultError?.message)
      process.exit(1)
    }
    vaultId = vault.id
  }

  const keyMaterialHex = deriveOrgVaultKeyMaterial(vaultKeyMaterial, org.id)
  const cryptoKey = await deriveKey(hexToArrayBuffer(keyMaterialHex))

  const payload = {
    username: 'test-user',
    password: TEST_PLAINTEXT,
    notes: 'Phase 4 round-trip verification — not a real credential',
  }

  const encryptedData = await encryptPayload(cryptoKey, payload)

  if (encryptedData.includes(TEST_PLAINTEXT)) {
    console.error('FAIL: Ciphertext contains plaintext (encryption broken)')
    process.exit(1)
  }

  await supabase.from('vault_items').delete().eq('name', TEST_ITEM_NAME)

  const { data: inserted, error: insertError } = await supabase
    .from('vault_items')
    .insert({
      vault_id: vaultId,
      created_by: user.id,
      item_type: 'note',
      name: TEST_ITEM_NAME,
      encrypted_data: encryptedData,
    })
    .select('id, encrypted_data')
    .single()

  if (insertError || !inserted) {
    console.error('FAIL: Insert failed', insertError?.message)
    process.exit(1)
  }

  const { data: fetched, error: fetchError } = await supabase
    .from('vault_items')
    .select('encrypted_data')
    .eq('id', inserted.id)
    .single()

  if (fetchError || !fetched) {
    console.error('FAIL: Fetch failed', fetchError?.message)
    process.exit(1)
  }

  if (fetched.encrypted_data.includes(TEST_PLAINTEXT)) {
    console.error('FAIL: DB row contains plaintext password')
    process.exit(1)
  }

  const decrypted = await decryptPayload(cryptoKey, fetched.encrypted_data)

  if (decrypted.password !== TEST_PLAINTEXT) {
    console.error('FAIL: Decrypted password does not match original')
    console.error('  expected:', TEST_PLAINTEXT)
    console.error('  got:     ', decrypted.password)
    process.exit(1)
  }

  if (decrypted.username !== payload.username) {
    console.error('FAIL: Decrypted username mismatch')
    process.exit(1)
  }

  await supabase.from('vault_items').delete().eq('id', inserted.id)

  console.log('')
  console.log('=== Phase 4 crypto round-trip: PASS ===')
  console.log('')
  console.log('Original plaintext (password field):', TEST_PLAINTEXT)
  console.log('Decrypted password:               ', decrypted.password)
  console.log('Match:                            ', decrypted.password === TEST_PLAINTEXT)
  console.log('')
  console.log('DB ciphertext length:             ', fetched.encrypted_data.length, 'chars')
  console.log('Plaintext found in DB:            ', fetched.encrypted_data.includes(TEST_PLAINTEXT) ? 'YES (bad)' : 'NO (good)')
  console.log('Test item cleaned up:             ', 'yes')
  console.log('')
}

main().catch((err) => {
  console.error('FAIL: Unexpected error', err)
  process.exit(1)
})
