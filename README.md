# TwoDefend Vault

Internal company credential/password vault for TwoDefend employees.

**Spec:** See [VAULT_AGENT.md](./VAULT_AGENT.md) for the complete project specification.

## Phase 1 status

Local scaffold is complete. Production deploy requires external credentials (see below).

## Development

```bash
cd vault-app
cp .env.example .env   # fill in values from team
npm install
npm run dev
```

## Build

```bash
npm run build
```

Build uses the Netlify Nitro preset (`dist/` + serverless functions).

## Database migrations

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor after the project is created.

## Deployment (Netlify)

- Base directory: `vault-app`
- Build command: `npm run build`
- Publish directory: `dist`
- Set all env vars from `.env.example` in Netlify site settings
