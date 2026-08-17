import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Client } = pg

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const projectRef = new URL(url).hostname.split('.')[0]

async function verifyViaApi() {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('organizations').select('id').limit(1)
  return error
}

async function runViaPostgres(connectionString) {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const sql = readFileSync(new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url), 'utf8')
  await client.query(sql)
  await client.end()
}

async function main() {
  const apiError = await verifyViaApi()
  if (!apiError) {
    console.log('MIGRATION_ALREADY_APPLIED')
    return
  }

  if (apiError.code !== 'PGRST205' && !apiError.message.includes('does not exist') && !apiError.message.includes('Could not find')) {
    console.log('API_CHECK:', apiError.message)
  }

  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD
  if (!dbPassword) {
    console.error('NEED_DB_PASSWORD')
    process.exit(2)
  }

  const connectionString = process.env.DATABASE_URL
    || `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres`

  await runViaPostgres(connectionString)
  console.log('MIGRATION_SUCCESS')

  const afterError = await verifyViaApi()
  if (afterError) {
    console.error('VERIFY_FAILED:', afterError.message)
    process.exit(1)
  }
  console.log('VERIFY_SUCCESS')
}

main().catch((err) => {
  console.error('MIGRATION_FAILED:', err.message)
  process.exit(1)
})
