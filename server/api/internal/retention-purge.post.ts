import { runRetentionPurge, verifyCronSecret } from '../../utils/retention-purge'

export default defineEventHandler(async (event) => {
  verifyCronSecret(event)
  const result = await runRetentionPurge()
  return { ok: true, result }
})
