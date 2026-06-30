-- Personal Ability OS · V7 Mature Product schema draft
-- Goal: turn the static MVP into a real multi-user platform while keeping flexible profile JSON.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  avatar_url text,
  plan text not null default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references users(id) on delete set null,
  plan text not null default 'team',
  created_at timestamptz default now()
);

create table if not exists organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz default now(),
  primary key (organization_id, user_id)
);

create table if not exists templates (
  id text primary key,
  name text not null,
  scenario text not null,
  accent text,
  config_json jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  handle text unique not null,
  template_id text references templates(id),
  mode text not null default 'job',
  draft_json jsonb not null default '{}'::jsonb,
  published_json jsonb not null default '{}'::jsonb,
  visibility text default 'public',
  health_score int default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists profile_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  version_no int not null,
  snapshot_json jsonb not null,
  note text,
  created_at timestamptz default now(),
  unique(profile_id, version_no)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  visitor_name text,
  visitor_email text,
  intent text,
  message text,
  source text default 'public_profile',
  status text default 'new',
  created_at timestamptz default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  domain text unique not null,
  status text default 'pending',
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  path text,
  referrer text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan text not null,
  status text not null default 'trialing',
  provider text,
  provider_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_profiles_handle on profiles(handle);
create index if not exists idx_profiles_org on profiles(organization_id);
create index if not exists idx_profile_versions_profile_id on profile_versions(profile_id, version_no desc);
create index if not exists idx_leads_profile_id on leads(profile_id, created_at desc);
create index if not exists idx_analytics_profile_id_created_at on analytics_events(profile_id, created_at desc);
