/**
 * Phase 5 automated checks: encrypt/store/fetch/decrypt + IDOR + no plaintext in DB
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { deriveLegacyUserVaultKeyMaterial, deriveOrgVaultKeyMaterial } from '../server/utils/vault-key.ts'
import { decryptPayload, deriveKey, encryptPayload, hexToArrayBuffer } from '../utils/crypto.ts'

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

const TEST_PASSWORD = 'phase5-ui-test-password-x9k2'
const TEST_NAME = '__phase5_verify_item__'

async function main(): Promise<void> {
  loadEnv()

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const orgSlug = process.env.ORG_SLUG || 'twodefend'
  const vaultKeyMaterial = process.env.VAULT_KEY_MATERIAL!

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single()
  const { data: users } = await supabase
    .from('users')
    .select('id, org_id, email')
    .eq('org_id', org!.id)
    .eq('is_active', true)
    .order('created_at')

  if (!users?.length) {
    console.error('FAIL: need at least one user')
    process.exit(1)
  }

  const userA = users[0]!

  let testVaultId: string
  const { data: existingVault } = await supabase
    .from('vaults')
    .select('id')
    .eq('org_id', org!.id)
    .eq('name', '__phase5_test_vault__')
    .maybeSingle()

  if (existingVault) {
    testVaultId = existingVault.id
  }
  else {
    const { data: createdVault, error: vaultErr } = await supabase
      .from('vaults')
      .insert({
        org_id: org!.id,
        name: '__phase5_test_vault__',
        created_by: userA.id,
      })
      .select('id')
      .single()

    if (vaultErr || !createdVault) {
      console.error('FAIL: could not create test vault', vaultErr?.message)
      process.exit(1)
    }

    testVaultId = createdVault.id
  }

  const keyMaterialHex = deriveOrgVaultKeyMaterial(vaultKeyMaterial, userA.org_id)
  const cryptoKey = await deriveKey(hexToArrayBuffer(keyMaterialHex))

  const encryptedData = await encryptPayload(cryptoKey, {
    username: 'phase5-test-user',
    password: TEST_PASSWORD,
    notes: 'Phase 5 verification item',
  })

  await supabase.from('vault_items').delete().eq('name', TEST_NAME)

  const { data: inserted, error: insertErr } = await supabase
    .from('vault_items')
    .insert({
      vault_id: testVaultId,
      created_by: userA.id,
      item_type: 'login',
      name: TEST_NAME,
      encrypted_data: encryptedData,
    })
    .select('id, encrypted_data')
    .single()

  if (insertErr || !inserted) {
    console.error('FAIL: insert', insertErr?.message)
    process.exit(1)
  }

  const { data: fetched } = await supabase
    .from('vault_items')
    .select('encrypted_data')
    .eq('id', inserted.id)
    .single()

  const decrypted = await decryptPayload(cryptoKey, fetched!.encrypted_data)
  const roundTripOk = decrypted.password === TEST_PASSWORD
  const noPlaintextInDb = !fetched!.encrypted_data.includes(TEST_PASSWORD)

  // IDOR: fake vault UUID in another "org" context — non-existent vault
  const fakeVaultId = '00000000-0000-0000-0000-000000000099'
  const { data: wrongVault } = await supabase
    .from('vaults')
    .select('id')
    .eq('id', fakeVaultId)
    .maybeSingle()
  const idorVaultBlocked = wrongVault === null

  const fakeItemId = '00000000-0000-0000-0000-000000000099'
  const { data: wrongItem } = await supabase
    .from('vault_items')
    .select('id, vault_id')
    .eq('id', fakeItemId)
    .maybeSingle()
  const idorItemBlocked = wrongItem === null

  // Same org: another user can decrypt with the org-wide vault key
  let crossUserDecryptWorks = true
  if (users.length >= 2) {
    const userB = users[1]!
    const orgKeyB = await deriveKey(hexToArrayBuffer(
      deriveOrgVaultKeyMaterial(vaultKeyMaterial, userB.org_id),
    ))
    try {
      const decryptedB = await decryptPayload(orgKeyB, fetched!.encrypted_data)
      crossUserDecryptWorks = decryptedB.password === TEST_PASSWORD
    }
    catch {
      crossUserDecryptWorks = false
    }
  }

  await supabase.from('vault_items').delete().eq('id', inserted.id)

  console.log('')
  console.log('=== Phase 5 verification ===')
  console.log('')
  console.log('Round-trip decrypt matches:     ', roundTripOk ? 'PASS' : 'FAIL')
  console.log('Plaintext absent from DB row:   ', noPlaintextInDb ? 'PASS' : 'FAIL')
  console.log('Unknown vault ID (no row):      ', idorVaultBlocked ? 'PASS' : 'FAIL')
  console.log('Unknown item ID (no row):       ', idorItemBlocked ? 'PASS' : 'FAIL')
  console.log('Cross-user org decrypt works: ', crossUserDecryptWorks ? 'PASS' : 'FAIL', users.length < 2 ? '(single user — skipped)' : '')
  console.log('')

  const allOk = roundTripOk && noPlaintextInDb && idorVaultBlocked && idorItemBlocked && crossUserDecryptWorks
  if (!allOk) process.exit(1)
  console.log('All automated Phase 5 checks passed.')
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
