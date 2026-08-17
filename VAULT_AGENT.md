# TwoDefend Vault — Agent Project Spec

> **Read this file fully before writing any code.**
> This is the single source of truth for the vault application.
> Follow the phases in order. Do not skip phases.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| App name | TwoDefend Vault |
| Purpose | Internal company credential/password vault for TwoDefend employees |
| URL | `vault.twodefend.com` |
| Framework | Nuxt 3 (SSR mode, Nitro server) |
| Hosting | Netlify (separate site from twodefend.com) |
| Database | Supabase (PostgreSQL) |
| Auth provider (current) | Zoho SSO via SAML 2.0 |
| Auth provider (future) | Microsoft Entra ID (SAML or OIDC) |
| Encryption | Client-side AES-256-GCM, zero-knowledge design |

This is a **security application**. Security correctness is always more important than convenience or speed of delivery.

---

## 2. Absolute Rules

- NEVER store plaintext passwords, TOTP secrets, API keys, or SSH keys in the database.
- NEVER put `SUPABASE_SERVICE_ROLE_KEY`, SSO client secrets, or private keys in client-side code or Nuxt public runtimeConfig.
- NEVER use `Math.random()` for anything cryptographic. Use `crypto.getRandomValues()` or Node `crypto`.
- NEVER hard-code Zoho endpoints, entity IDs, or certificates in application logic. Store them as environment variables.
- NEVER expose vault encryption keys to the server. Encryption/decryption happens in the browser only.
- ALL database queries that access vault data MUST enforce server-side authorization. RLS is a defense-in-depth layer, not the primary check.
- Do NOT build phase N+1 until phase N is complete and working.

---

## 3. Tech Stack (Exact)

```
nuxt@^3.x
@nuxtjs/supabase            -- Supabase Nuxt module
nuxt-security               -- Security headers (CSP, HSTS, etc.)
passport-saml OR saml2-js   -- SAML 2.0 for Zoho/Entra (server-side only)
otpauth                     -- TOTP generation (browser-side, after decryption)
crypto (Web Crypto API)     -- AES-256-GCM, key derivation (browser-side)
```

No additional crypto libraries unless explicitly approved. Use browser Web Crypto API and Node built-in `crypto` only.

---

## 4. Architecture Overview

```
Browser (Nuxt client)
  |
  |-- HTTPS only
  v
Netlify CDN / Edge
  |
  v
Nuxt Nitro Server (server/api/**, server/middleware/**)
  |
  +--[1]--> Zoho SAML endpoint (login redirect / assertion validation)
  |
  +--[2]--> Supabase (PostgreSQL, RLS enabled)
              |
              |-- users
              |-- identity_providers
              |-- organizations
              |-- vaults
              |-- vault_items        <-- all sensitive fields: ciphertext only
              |-- audit_logs
              |-- permissions
              |-- sessions
```

The Nitro server handles:
- SAML SP logic (server-side, never client)
- Session tokens (HttpOnly cookies)
- Authorization checks before any DB query
- Audit logging

The browser handles:
- Vault key derivation and encryption/decryption
- TOTP code generation (after decryption of the stored secret)
- Password generation

---

## 5. Database Schema

Run these migrations in Supabase SQL editor in order.

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Organizations (multi-tenant ready, start with one)
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz default now()
);

-- Users (internal stable IDs, not tied to any IdP)
create table users (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) on delete cascade,
  email           text not null,
  display_name    text,
  role            text not null check (role in ('admin','member','readonly')),
  is_active       boolean not null default true,
  created_at      timestamptz default now(),
  unique(org_id, email)
);

-- Identity provider linkage (one user can have multiple IdP links)
create table identity_links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references users(id) on delete cascade,
  provider          text not null check (provider in ('zoho','microsoft','local')),
  provider_subject  text not null,   -- Zoho NameID or Entra object ID
  linked_at         timestamptz default now(),
  unique(provider, provider_subject)
);

-- Vaults (folders of credentials)
create table vaults (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  name        text not null,
  description text,
  created_by  uuid references users(id),
  created_at  timestamptz default now()
);

-- Permissions: which users/roles can access which vaults
create table vault_permissions (
  id          uuid primary key default gen_random_uuid(),
  vault_id    uuid references vaults(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  access      text not null check (access in ('read','write','admin')),
  granted_by  uuid references users(id),
  granted_at  timestamptz default now(),
  unique(vault_id, user_id)
);

-- Vault items (all sensitive fields stored as ciphertext)
create table vault_items (
  id              uuid primary key default gen_random_uuid(),
  vault_id        uuid references vaults(id) on delete cascade,
  created_by      uuid references users(id),
  item_type       text not null check (item_type in ('login','api_key','ssh','totp','note','recovery')),
  -- Plaintext metadata (searchable, non-sensitive)
  name            text not null,
  url             text,
  tags            text[],
  -- Encrypted payload (AES-256-GCM, client-side)
  encrypted_data  text not null,  -- base64(iv + ciphertext + authTag), all sensitive fields inside
  -- Timestamps
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Audit log (append-only, never contains plaintext secrets)
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id),
  user_id     uuid references users(id),
  action      text not null,
  target_type text,               -- 'vault', 'vault_item', 'user', 'session', etc.
  target_id   uuid,
  ip_address  inet,
  user_agent  text,
  success     boolean not null default true,
  metadata    jsonb,              -- non-sensitive context only
  created_at  timestamptz default now()
);

-- Active sessions
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  token_hash    text unique not null,  -- SHA-256 of the session token
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  last_seen_at  timestamptz default now()
);

-- RLS: enable on all tables
alter table users enable row level security;
alter table vaults enable row level security;
alter table vault_items enable row level security;
alter table vault_permissions enable row level security;
alter table audit_logs enable row level security;
alter table sessions enable row level security;

-- RLS policies are enforced AND backed by server-side auth checks.
-- The Nitro server always validates session + org_id + permissions before queries.
-- RLS is an additional layer, not the only layer.
```

---

## 6. Encryption Model

### 6.1 Key Hierarchy

```
User's SSO session
        |
        v
Server issues vault_key_material (org-scoped random bytes, stored encrypted server-side)
        |
        v
Browser: PBKDF2 or HKDF derives vault_encryption_key
        |
        v
AES-256-GCM encrypts each vault_item's sensitive fields
        |
        v
encrypted_data stored in DB
```

### 6.2 What Goes Inside encrypted_data

The `encrypted_data` column stores a single JSON object encrypted as one AES-256-GCM blob:

```json
{
  "username": "...",
  "password": "...",
  "totp_secret": "...",
  "notes": "...",
  "recovery_codes": ["...", "..."],
  "custom_fields": [{"key": "...", "value": "..."}]
}
```

Encrypt the entire JSON before sending to server. Decrypt in browser after fetching.

### 6.3 Encryption Implementation (Web Crypto API)

```typescript
// utils/crypto.ts

const ALGORITHM = { name: 'AES-GCM', length: 256 }

export async function deriveKey(keyMaterial: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', keyMaterial, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('vault-v1') },
    baseKey,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  // Concatenate: iv(12) + ciphertext
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(key: CryptoKey, b64: string): Promise<string> {
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
```

---

## 7. Authentication Flow

### 7.1 SAML Flow (Zoho, current)

```
1. User visits vault.twodefend.com
2. Nuxt middleware (auth.ts) checks for valid session cookie
3. No session → redirect to /login
4. /login page → user clicks "Sign in with Zoho"
5. GET /api/auth/saml/init
   → Nitro generates SAML AuthnRequest
   → Redirects user to Zoho SSO URL
6. Zoho authenticates user (+ MFA if configured)
7. Zoho POST assertion to /api/auth/saml/callback (ACS URL)
8. Nitro validates SAML assertion (signature, conditions, issuer)
9. Extract NameID (provider_subject), email, displayName
10. Lookup or create user in DB via identity_links table
11. Create session → set HttpOnly Secure SameSite=Strict cookie
12. Redirect to /vault
```

### 7.2 IdP Abstraction Layer

Put all IdP logic behind a single interface. Never let SAML/OIDC details leak into business logic.

```typescript
// server/utils/identity/types.ts
export interface AuthenticatedIdentity {
  provider: 'zoho' | 'microsoft'
  providerSubject: string    // Zoho NameID or Entra object ID
  email: string
  displayName?: string
}

// server/utils/identity/zoho.ts  ← implements this interface
// server/utils/identity/microsoft.ts  ← added later, same interface
```

### 7.3 Session Management

- Session token: cryptographically random 32 bytes, base64url
- Store SHA-256(token) in DB, never the raw token
- Cookie: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` (8h)
- Session expires after 8h or explicit logout
- Admins can revoke any session from audit/admin panel

---

## 8. File Structure

```
vault-app/
├── VAULT_AGENT.md                  ← this file
├── .env.example                    ← lists all required env vars (no values)
├── nuxt.config.ts
├── package.json
│
├── assets/
│
├── pages/
│   ├── index.vue                   ← redirects to /vault or /login
│   ├── login.vue                   ← "Sign in with Zoho" button
│   ├── vault/
│   │   ├── index.vue               ← vault list
│   │   └── [vaultId]/
│   │       ├── index.vue           ← items in vault
│   │       └── [itemId].vue        ← view/edit single item
│   ├── admin/
│   │   ├── index.vue               ← admin dashboard
│   │   ├── users.vue               ← user management
│   │   ├── audit.vue               ← audit log viewer
│   │   └── sessions.vue            ← active session management
│   └── settings/
│       └── index.vue
│
├── components/
│   ├── vault/
│   │   ├── VaultList.vue
│   │   ├── VaultItem.vue
│   │   └── ItemForm.vue
│   ├── crypto/
│   │   ├── PasswordGenerator.vue
│   │   └── TOTPDisplay.vue
│   └── ui/
│       ├── CopyButton.vue          ← handles clipboard + auto-clear
│       └── SecretField.vue         ← masked input with reveal button
│
├── composables/
│   ├── useVaultKey.ts              ← manages in-memory vault encryption key
│   ├── useSession.ts
│   └── useAudit.ts
│
├── middleware/
│   ├── auth.ts                     ← checks session cookie on every route
│   └── permissions.ts             ← checks vault access per route
│
├── utils/
│   ├── crypto.ts                   ← Web Crypto API helpers (encrypt/decrypt/deriveKey)
│   └── password-generator.ts      ← crypto.getRandomValues() based
│
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── saml/
│   │   │   │   ├── init.get.ts     ← generate AuthnRequest, redirect to IdP
│   │   │   │   └── callback.post.ts ← validate assertion, create session
│   │   │   └── logout.post.ts
│   │   ├── vaults/
│   │   │   ├── index.get.ts        ← list accessible vaults
│   │   │   ├── index.post.ts       ← create vault (admin)
│   │   │   └── [vaultId]/
│   │   │       ├── index.get.ts    ← get vault metadata
│   │   │       ├── items.get.ts    ← list items (ciphertext, no decrypt)
│   │   │       └── items.post.ts   ← create item
│   │   ├── items/
│   │   │   ├── [itemId].get.ts     ← fetch single item (ciphertext)
│   │   │   ├── [itemId].put.ts     ← update item
│   │   │   └── [itemId].delete.ts
│   │   ├── admin/
│   │   │   ├── users.get.ts
│   │   │   ├── users.post.ts
│   │   │   ├── users/[userId].patch.ts
│   │   │   ├── audit.get.ts
│   │   │   └── sessions.delete.ts  ← revoke session
│   │   └── vault-key.get.ts        ← returns org key material (after auth check)
│   │
│   ├── middleware/
│   │   ├── 01-session.ts           ← validates session cookie on every server request
│   │   └── 02-audit.ts             ← attaches audit context
│   │
│   └── utils/
│       ├── session.ts              ← create/validate/revoke sessions
│       ├── authorize.ts            ← permission check helpers
│       ├── audit.ts                ← write audit log entries
│       ├── supabase.ts             ← server-side Supabase client (service role)
│       └── identity/
│           ├── types.ts
│           ├── zoho.ts             ← SAML validation, NameID extraction
│           └── microsoft.ts        ← (stub, implemented in Phase 10+)
│
└── public/
```

---

## 9. Environment Variables

Create `.env.example` with all of these. Never commit `.env`.

```bash
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...         # safe for client
SUPABASE_SERVICE_ROLE_KEY=eyJ... # server ONLY, never expose to browser

# SAML / Zoho (server-side only)
SAML_SP_ENTITY_ID=https://vault.twodefend.com
SAML_SP_ACS_URL=https://vault.twodefend.com/api/auth/saml/callback
SAML_IDP_SSO_URL=                # from Zoho SSO config
SAML_IDP_ENTITY_ID=              # from Zoho SSO config
SAML_IDP_CERTIFICATE=            # PEM cert from Zoho SSO config (base64 inline)

# Sessions
SESSION_SECRET=                  # 64 random hex chars, generate with: openssl rand -hex 64

# App
APP_URL=https://vault.twodefend.com
ORG_SLUG=twodefend               # your organization slug in DB

# Vault key material (org-level, not per-user)
# This is NOT the encryption key itself.
# This is server-held key material used to derive per-session vault keys.
VAULT_KEY_MATERIAL=              # 64 random hex chars, generate with: openssl rand -hex 64

# Netlify build
NODE_ENV=production
```

In `nuxt.config.ts`, only expose `SUPABASE_URL` and `SUPABASE_ANON_KEY` as `runtimeConfig.public`. Everything else is server-only.

---

## 10. nuxt.config.ts (baseline)

```typescript
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', 'nuxt-security'],
  
  runtimeConfig: {
    // Server-only
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    samlIdpSsoUrl: process.env.SAML_IDP_SSO_URL,
    samlIdpEntityId: process.env.SAML_IDP_ENTITY_ID,
    samlIdpCertificate: process.env.SAML_IDP_CERTIFICATE,
    samlSpEntityId: process.env.SAML_SP_ENTITY_ID,
    samlSpAcsUrl: process.env.SAML_SP_ACS_URL,
    sessionSecret: process.env.SESSION_SECRET,
    vaultKeyMaterial: process.env.VAULT_KEY_MATERIAL,
    
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      appUrl: process.env.APP_URL,
    }
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'https://*.supabase.co'],
        'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
      },
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
    },
    rateLimiter: {
      tokensPerInterval: 50,
      interval: 'minute',
    }
  },
  
  supabase: {
    redirect: false, // we manage auth ourselves
  }
})
```

---

## 11. Build Phases

Complete each phase fully before starting the next. Commit at end of each phase.

### Phase 1 — Project Scaffold
- [ ] `npx nuxi init vault-app` in new directory
- [ ] Install all dependencies from Section 3
- [ ] Create full folder structure from Section 8
- [ ] Create `.env.example` from Section 9
- [ ] Configure `nuxt.config.ts` from Section 10
- [ ] Create Netlify site (separate from twodefend.com)
- [ ] Configure custom domain `vault.twodefend.com` on Netlify
- [ ] Set up Supabase project
- [ ] Run DB migrations from Section 5
- [ ] Verify build passes, deploy blank app, confirm HTTPS on subdomain

### Phase 2 — Zoho SAML SSO
- [ ] Create SAML SP service in `server/utils/identity/zoho.ts`
- [ ] Implement `GET /api/auth/saml/init` (generate AuthnRequest, redirect)
- [ ] Implement `POST /api/auth/saml/callback` (validate assertion, extract identity)
- [ ] Implement session creation in `server/utils/session.ts`
- [ ] Set HttpOnly Secure SameSite cookie
- [ ] Implement `server/middleware/01-session.ts`
- [ ] Implement `middleware/auth.ts` (client-side route guard)
- [ ] Implement `POST /api/auth/logout`
- [ ] Create `/login` page with Zoho SSO button
- [ ] Test: login works, session persists, logout clears cookie
- [ ] Test: unauthenticated access to /vault redirects to /login

### Phase 3 — Organization, Users, Roles
- [ ] Seed initial organization row for TwoDefend
- [ ] Implement user provisioning on first SSO login (create user + identity_link)
- [ ] Implement `server/utils/authorize.ts` (requireRole, requireVaultAccess helpers)
- [ ] Implement admin user management API routes
- [ ] Implement admin UI: list users, change roles, deactivate users
- [ ] Test: deactivated user cannot log in (check is_active after SAML validation)

### Phase 4 — Encryption Architecture
- [ ] Implement `utils/crypto.ts` using Web Crypto API (Section 6.3)
- [ ] Implement `GET /api/vault-key` — server returns HMAC-derived key material scoped to session user + org
- [ ] Implement `useVaultKey.ts` composable — fetches key material, derives CryptoKey, holds in memory only (never localStorage)
- [ ] Write unit tests: encrypt → store → fetch → decrypt round trip
- [ ] Verify: raw DB contains no plaintext after a test item is inserted
- [ ] DO NOT store real credentials yet

### Phase 5 — Vaults and Vault Items
- [ ] Implement vault CRUD API routes (all enforce authorization)
- [ ] Implement vault item API routes (return ciphertext only, no server-side decrypt)
- [ ] Implement `/vault` page (list authorized vaults)
- [ ] Implement `/vault/[vaultId]` page (list items)
- [ ] Implement `/vault/[vaultId]/[itemId]` page (decrypt in browser, display)
- [ ] Implement `ItemForm.vue` (encrypt before POST)
- [ ] Seed example vaults matching TwoDefend's structure (Section 12 of plan)
- [ ] Test: IDOR — user A cannot access user B's vault items by guessing IDs

### Phase 6 — Password Generator
- [ ] Implement `utils/password-generator.ts` using `crypto.getRandomValues()`
- [ ] Implement `PasswordGenerator.vue` with options: length, uppercase, lowercase, numbers, symbols, exclude ambiguous
- [ ] Integrate into `ItemForm.vue`

### Phase 7 — TOTP Support
- [ ] Add TOTP secret field to vault item encrypted payload
- [ ] Implement `TOTPDisplay.vue`: decrypt secret in browser → generate 6-digit code via `otpauth` → display with countdown
- [ ] Never send decrypted TOTP secret to server
- [ ] Test: TOTP codes are correct and rotate on time

### Phase 8 — Clipboard Security
- [ ] Implement `CopyButton.vue`: copy to clipboard, auto-clear after 30s, show countdown
- [ ] Implement `SecretField.vue`: masked by default, reveal on click, auto-mask after 30s

### Phase 9 — Audit Logging
- [ ] Implement `server/utils/audit.ts`
- [ ] Add audit log calls to: login, logout, vault open, item view, item create, item update, item delete, user management actions, session revoke, failed auth
- [ ] Implement admin audit log viewer page with filtering
- [ ] Verify: no sensitive values appear in audit log metadata

### Phase 10 — Admin Controls
- [ ] Session management: list active sessions, revoke any session
- [ ] Vault permissions management: grant/revoke per-user access
- [ ] User deactivation with immediate session revocation

### Phase 11 — Security Testing
- [ ] Auth: valid login, invalid/tampered assertion, deactivated user, expired session
- [ ] AuthZ: IDOR on vault IDs and item IDs, role escalation, cross-org access
- [ ] Crypto: DB dump inspection (no plaintext), API response inspection (no keys exposed)
- [ ] Web: XSS via item name/URL fields, CSRF, clickjacking (check CSP + frame headers)
- [ ] Rate limiting: verify on /api/auth/saml/init and /api/auth/saml/callback

### Phase 12 — Production Migration
- [ ] Key backup and recovery procedure documented
- [ ] Confirm Supabase backups enabled and encrypted
- [ ] Migrate real company credentials only after Phase 11 passes

---

## 12. Zoho SSO Setup Steps (Do Before Phase 2 Code)

Before writing any auth code, gather the following from Zoho:

1. Log into `mail.zoho.eu` → Admin panel → go to **Directory** or **One Auth** settings
2. Find "Custom Applications" or "SAML Applications"
3. Create new SAML application with these SP values:
   - Entity ID: `https://vault.twodefend.com`
   - ACS URL: `https://vault.twodefend.com/api/auth/saml/callback`
   - Name ID format: `emailAddress`
   - Attribute mappings: `email`, `displayName` (or `firstName` + `lastName`)
4. Download or copy from Zoho:
   - IdP SSO URL (`SAML_IDP_SSO_URL`)
   - IdP Entity ID (`SAML_IDP_ENTITY_ID`)
   - IdP Certificate (`SAML_IDP_CERTIFICATE`)
5. Set MFA policy on the Zoho application to "Required"

---

## 13. Microsoft Entra ID (Future — Stub Only in Phase 2)

Create `server/utils/identity/microsoft.ts` as a stub that throws "not implemented". It should implement the same `AuthenticatedIdentity` interface as the Zoho provider. When Entra ID is ready:

- Add OIDC or SAML config for Entra
- Account linking: match on `email` to existing user, prompt admin to confirm, add new `identity_link` row
- Do NOT create duplicate users

---

## 14. What the Agent Needs From the Human

At the end of Phase 1 scaffold and before starting Phase 2, pause and collect these values. List exactly what is missing:

### Required immediately (Phase 1)

| Item | Where to get it | Env var |
|------|----------------|---------|
| Supabase project URL | Supabase dashboard → Project Settings → API | `SUPABASE_URL` |
| Supabase anon key | Supabase dashboard → Project Settings → API | `SUPABASE_ANON_KEY` |
| Supabase service role key | Supabase dashboard → Project Settings → API | `SUPABASE_SERVICE_ROLE_KEY` |
| Netlify site ID / team | Create on netlify.com | (Netlify config) |
| Session secret | `openssl rand -hex 64` | `SESSION_SECRET` |
| Vault key material | `openssl rand -hex 64` | `VAULT_KEY_MATERIAL` |

### Required before Phase 2 (SSO)

| Item | Where to get it | Env var |
|------|----------------|---------|
| Zoho IdP SSO URL | Zoho admin → SAML app config | `SAML_IDP_SSO_URL` |
| Zoho IdP Entity ID | Zoho admin → SAML app config | `SAML_IDP_ENTITY_ID` |
| Zoho IdP Certificate | Zoho admin → SAML app config → download cert | `SAML_IDP_CERTIFICATE` |

### Agent cannot proceed past Phase 1 without the Supabase credentials.
### Agent cannot proceed past Phase 1.5 without the Zoho SAML values.
### Do NOT generate fake/placeholder values for these. Stop and ask the human.

---

## 15. Definition of Done

The vault is considered production-ready when:

- [ ] All Phase 1–11 checkboxes are complete
- [ ] DB dump contains no plaintext passwords, TOTP secrets, or API keys
- [ ] An admin can log in, create a vault, add a credential, and retrieve it correctly
- [ ] A member cannot access a vault they have no permission for
- [ ] A read-only user cannot create or modify items
- [ ] Logout and session expiry fully invalidate access
- [ ] Audit log captures all actions listed in Phase 9
- [ ] All env vars are set in Netlify (not in source code)
- [ ] `npm audit` passes with no high/critical vulnerabilities
