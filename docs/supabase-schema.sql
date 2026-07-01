-- Personal Ability OS · Supabase MVP schema
-- Run this in Supabase Dashboard -> SQL Editor.
-- Browser code must use only the anon/publishable key. Never expose service_role.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.templates (
  id text primary key,
  name text not null,
  scenario text not null default 'job',
  accent text,
  config_json jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.templates (id, name, scenario, accent)
values
  ('signal-light', 'Signal Light', 'job', '#315eff'),
  ('build-story', 'Build Story', 'creator', '#111111'),
  ('craft-dark', 'Craft Dark', 'builder', '#8b5cf6')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  template_id text references public.templates(id) default 'signal-light',
  mode text not null default 'job',
  draft_json jsonb not null default '{}'::jsonb,
  visibility_json jsonb not null default '{}'::jsonb,
  health_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.published_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  template_id text references public.templates(id) default 'signal-light',
  mode text not null default 'job',
  profile_json jsonb not null default '{}'::jsonb,
  health_score int not null default 0,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_no bigint not null,
  snapshot_json jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  unique(profile_id, version_no)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  profile_handle text not null,
  visitor_name text,
  visitor_email text,
  intent text,
  message text,
  source text not null default 'public_profile',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  profile_handle text,
  event_type text not null,
  path text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_handle on public.profiles(handle);
create index if not exists idx_published_profiles_handle on public.published_profiles(handle);
create index if not exists idx_leads_profile_id_created_at on public.leads(profile_id, created_at desc);
create index if not exists idx_versions_profile_id_version on public.profile_versions(profile_id, version_no desc);
create index if not exists idx_analytics_profile_id_created_at on public.analytics_events(profile_id, created_at desc);

alter table public.leads drop constraint if exists leads_visitor_name_length;
alter table public.leads add constraint leads_visitor_name_length
  check (visitor_name is null or char_length(visitor_name) <= 80);

alter table public.leads drop constraint if exists leads_visitor_email_format;
alter table public.leads add constraint leads_visitor_email_format
  check (visitor_email is null or visitor_email = '' or visitor_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.leads drop constraint if exists leads_intent_length;
alter table public.leads add constraint leads_intent_length
  check (intent is null or char_length(intent) <= 80);

alter table public.leads drop constraint if exists leads_message_length;
alter table public.leads add constraint leads_message_length
  check (message is null or char_length(message) <= 1200);

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new', 'read', 'archived'));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists published_profiles_set_updated_at on public.published_profiles;
create trigger published_profiles_set_updated_at
before update on public.published_profiles
for each row execute function public.set_updated_at();

alter table public.templates enable row level security;
alter table public.profiles enable row level security;
alter table public.published_profiles enable row level security;
alter table public.profile_versions enable row level security;
alter table public.leads enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "public templates are readable" on public.templates;
create policy "public templates are readable"
on public.templates for select
to anon, authenticated
using (is_public = true);

drop policy if exists "owners can read own profiles" on public.profiles;
create policy "owners can read own profiles"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "owners can create own profiles" on public.profiles;
create policy "owners can create own profiles"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "owners can update own profiles" on public.profiles;
create policy "owners can update own profiles"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "owners can delete own profiles" on public.profiles;
create policy "owners can delete own profiles"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "published profiles are readable" on public.published_profiles;
create policy "published profiles are readable"
on public.published_profiles for select
to anon, authenticated
using (true);

drop policy if exists "owners can publish profiles" on public.published_profiles;
create policy "owners can publish profiles"
on public.published_profiles for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = published_profiles.profile_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "owners can update published profiles" on public.published_profiles;
create policy "owners can update published profiles"
on public.published_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = published_profiles.profile_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "owners can unpublish profiles" on public.published_profiles;
create policy "owners can unpublish profiles"
on public.published_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "owners can read profile versions" on public.profile_versions;
create policy "owners can read profile versions"
on public.profile_versions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "owners can insert profile versions" on public.profile_versions;
create policy "owners can insert profile versions"
on public.profile_versions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles p
    where p.id = profile_versions.profile_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "visitors can create leads for published profiles" on public.leads;
create policy "visitors can create leads for published profiles"
on public.leads for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.published_profiles pp
    where pp.profile_id = leads.profile_id
      and pp.handle = leads.profile_handle
  )
);

drop policy if exists "owners can read leads" on public.leads;
create policy "owners can read leads"
on public.leads for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = leads.profile_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "owners can update leads" on public.leads;
create policy "owners can update leads"
on public.leads for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = leads.profile_id
      and p.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = leads.profile_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "public can write analytics" on public.analytics_events;
create policy "public can write analytics"
on public.analytics_events for insert
to anon, authenticated
with check (
  profile_id is not null
  and exists (
    select 1 from public.published_profiles pp
    where pp.profile_id = analytics_events.profile_id
      and (analytics_events.profile_handle is null or pp.handle = analytics_events.profile_handle)
  )
);

drop policy if exists "owners can read analytics" on public.analytics_events;
create policy "owners can read analytics"
on public.analytics_events for select
to authenticated
using (
  profile_id is null or exists (
    select 1 from public.profiles p
    where p.id = analytics_events.profile_id
      and p.user_id = (select auth.uid())
  )
);
