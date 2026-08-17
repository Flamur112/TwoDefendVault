-- TwoDefend Vault — initial schema (Section 5)
-- Run in Supabase SQL editor in order.

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
  provider_subject  text not null,
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
  name            text not null,
  url             text,
  tags            text[],
  encrypted_data  text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Audit log (append-only, never contains plaintext secrets)
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id),
  user_id     uuid references users(id),
  action      text not null,
  target_type text,
  target_id   uuid,
  ip_address  inet,
  user_agent  text,
  success     boolean not null default true,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- Active sessions
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  token_hash    text unique not null,
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
