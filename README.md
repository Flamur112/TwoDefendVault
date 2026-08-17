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

Build uses the Netlify Nitro preset (`.output/public` + serverless functions).

## Database migrations

Run migrations locally with `npm run migrate` (see `.env.example` for DB connection vars).

## Deployment (Netlify)

- Base directory: `vault-app`
- Build command: `npm run build`
- Publish directory: `.output/public`
- Set env vars from `.env.example` in Netlify site settings
- Production `APP_URL`: `https://vault.twodefend.com` (OAuth callback is derived automatically)
