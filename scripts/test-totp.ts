/**
 * Phase 7 TOTP verification (browser crypto + otpauth, no server)
 * Run: npm run test:totp
 */
import { Secret, TOTP } from 'otpauth'
import { generateTotpCode, parseTotpSecret, totpSecondsRemaining } from '../utils/totp.ts'

// RFC 6238 / common test secret (base32)
const TEST_SECRET = 'JBSWY3DPEHPK3PXP'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

function main(): void {
  // Parse base32
  assert(parseTotpSecret(TEST_SECRET) === TEST_SECRET, 'parse base32 secret')

  // Parse otpauth URI
  const uri = `otpauth://totp/TwoDefend:Test?secret=${TEST_SECRET}&issuer=TwoDefend`
  assert(parseTotpSecret(uri) === TEST_SECRET, 'parse otpauth URI')

  // Strip spaces
  assert(parseTotpSecret('JBSW Y3DP EHPK3PXP') === TEST_SECRET, 'strip spaces from secret')

  // RFC 6238 test vector (ASCII secret, T=59s) — validated via otpauth directly
  const rfcTotp = new TOTP({
    secret: Secret.fromUTF8('12345678901234567890'),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })
  assert(rfcTotp.generate({ timestamp: 59_000 }) === '287082', 'RFC 6238 vector')

  // Fixed timestamp for base32 test secret
  const ts = 1_234_567_890_000
  const code = generateTotpCode(TEST_SECRET, ts)
  assert(/^\d{6}$/.test(code), 'generates 6-digit code')
  assert(code === '742275', `known base32 code at fixed time (got ${code})`)

  // Same window → same code
  const code2 = generateTotpCode(TEST_SECRET, ts + 5000)
  assert(code === code2, 'same code within 30s window')

  // Next window → different code
  const code3 = generateTotpCode(TEST_SECRET, ts + 30_000)
  assert(code !== code3, 'code rotates after 30s')

  // Live generation
  const live = generateTotpCode(TEST_SECRET)
  assert(/^\d{6}$/.test(live), 'live code is 6 digits')

  const rem = totpSecondsRemaining()
  assert(rem >= 1 && rem <= 30, `seconds remaining in range (got ${rem})`)

  console.log('\nAll TOTP tests passed.')
}

main()
