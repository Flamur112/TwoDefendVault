/**
 * Apply pending SQL migrations from supabase/migrations/
 * Run: npm run migrate
 */
import dns from 'node:dns'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

dns.setDefaultResultOrder('ipv4first')

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

function buildConnectionUrls(): string[] {
  const urls: string[] = []

  if (process.env.DATABASE_URL) {
    urls.push(process.env.DATABASE_URL)
  }
  if (process.env.SUPABASE_DB_URL && process.env.SUPABASE_DB_URL !== process.env.DATABASE_URL) {
    urls.push(process.env.SUPABASE_DB_URL)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_DB_PASSWORD) {
    return urls
  }

  const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0]
  const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)

  if (process.env.SUPABASE_DB_POOLER_HOST) {
    urls.push(`postgresql://postgres.${projectRef}:${password}@${process.env.SUPABASE_DB_POOLER_HOST}:5432/postgres`)
  }

  urls.push(`postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`)

  if (!process.env.SUPABASE_DB_POOLER_HOST) {
    urls.push(`postgresql://postgres.${projectRef}:${password}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`)
    urls.push(`postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`)
  }

  return [...new Set(urls)]
}

async function connectClient(dbUrl: string): Promise<pg.Client> {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
}

async function connectWithFallback(urls: string[]): Promise<pg.Client> {
  const errors: string[] = []

  for (const dbUrl of urls) {
    const host = new URL(dbUrl.replace('postgresql://', 'http://')).hostname
    try {
      console.log(`Connecting via ${host}...`)
      return await connectClient(dbUrl)
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${host}: ${message}`)
      if (err instanceof Error && 'code' in err) {
        const code = (err as NodeJS.ErrnoException).code
        if (code === 'ENETUNREACH' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
          continue
        }
      }
      throw err
    }
  }

  console.error('Could not connect to Supabase Postgres.\n')
  for (const line of errors) {
    console.error(`  ${line}`)
  }
  console.error('')
  console.error('Set SUPABASE_DB_POOLER_HOST from Supabase → Project Settings → Database → Connection string (Session pooler host).')
  throw new Error('All database connection attempts failed')
}

async function tableExists(client: pg.Client, table: string): Promise<boolean> {
  const { rows } = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`])
  return Boolean(rows[0]?.exists)
}

async function columnExists(client: pg.Client, table: string, column: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  )
  return rows.length > 0
}

/** Mark migrations already applied before schema_migrations tracking existed. */
async function bootstrapExistingSchema(client: pg.Client, files: string[]): Promise<void> {
  if (!(await tableExists(client, 'organizations'))) return

  const baseline: Array<{ file: string, applied: () => Promise<boolean> }> = [
    { file: '001_initial_schema.sql', applied: async () => tableExists(client, 'organizations') },
    { file: '002_seed_organization.sql', applied: async () => tableExists(client, 'organizations') },
    { file: '003_seed_vaults.sql', applied: async () => tableExists(client, 'vaults') },
    { file: '004_clients.sql', applied: async () => tableExists(client, 'clients') },
    { file: '005_vault_client_id.sql', applied: async () => columnExists(client, 'vaults', 'client_id') },
    { file: '006_client_activity_index.sql', applied: async () => tableExists(client, 'client_activity') },
  ]

  for (const entry of baseline) {
    if (!files.includes(entry.file)) continue
    if (!(await entry.applied())) continue
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [entry.file])
    console.log(`Baseline: ${entry.file} (already in database)`)
  }
}

async function main(): Promise<void> {
  loadEnv()

  const urls = buildConnectionUrls()
  if (urls.length === 0) {
    console.error('Database connection not configured.\n')
    console.error('Add your Supabase database password to .env:')
    console.error('  SUPABASE_DB_PASSWORD=...')
    console.error('')
    console.error('Find it in Supabase → Project Settings → Database → Database password')
    console.error('')
    console.error('Optional if direct connection fails (IPv6/network issues):')
    console.error('  SUPABASE_DB_POOLER_HOST=aws-1-eu-west-1.pooler.supabase.com')
    process.exit(1)
  }

  const client = await connectWithFallback(urls)

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDir = resolve(import.meta.dirname, '../supabase/migrations')
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  await bootstrapExistingSchema(client, files)

  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file])
    if (rows.length > 0) {
      console.log(`Skip: ${file}`)
      continue
    }

    const sql = readFileSync(resolve(migrationsDir, file), 'utf8')
    console.log(`Applying: ${file}`)
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
    console.log(`Done: ${file}`)
  }

  await client.end()
  console.log('Migrations complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
