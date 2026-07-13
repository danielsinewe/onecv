create table public.onecv_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  content_hash text,
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (id, user_id)
);

create table public.onecv_profile_revisions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  schema_version integer not null check (schema_version > 0),
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  content_hash text,
  source text not null default 'cli' check (source in ('cli', 'web', 'import', 'system')),
  device_id text,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (profile_id, user_id)
    references public.onecv_profiles (id, user_id)
    on delete cascade
);

create table public.onecv_platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform = lower(platform) and platform ~ '^[a-z0-9_-]+$'),
  external_profile_url text,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform),
  unique (id, user_id)
);

create table public.onecv_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_account_id uuid,
  platform text not null check (platform = lower(platform) and platform ~ '^[a-z0-9_-]+$'),
  operation text not null check (operation in ('plan', 'fill', 'update', 'submit')),
  status text not null default 'started' check (status in ('started', 'succeeded', 'failed', 'cancelled')),
  dry_run boolean not null default true,
  plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (platform_account_id, user_id)
    references public.onecv_platform_accounts (id, user_id)
    on delete set null (platform_account_id),
  check (completed_at is null or completed_at >= started_at)
);

create index onecv_profile_revisions_profile_created_idx
  on public.onecv_profile_revisions (profile_id, created_at desc);

create index onecv_profile_revisions_user_created_idx
  on public.onecv_profile_revisions (user_id, created_at desc);

create index onecv_sync_runs_user_started_idx
  on public.onecv_sync_runs (user_id, started_at desc);

create index onecv_sync_runs_platform_started_idx
  on public.onecv_sync_runs (platform, started_at desc);

create or replace function public.onecv_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger onecv_profiles_set_updated_at
before update on public.onecv_profiles
for each row execute function public.onecv_set_updated_at();

create trigger onecv_platform_accounts_set_updated_at
before update on public.onecv_platform_accounts
for each row execute function public.onecv_set_updated_at();

alter table public.onecv_profiles enable row level security;
alter table public.onecv_profile_revisions enable row level security;
alter table public.onecv_platform_accounts enable row level security;
alter table public.onecv_sync_runs enable row level security;

create policy onecv_profiles_owner_access
on public.onecv_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy onecv_profile_revisions_owner_select
on public.onecv_profile_revisions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy onecv_profile_revisions_owner_insert
on public.onecv_profile_revisions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy onecv_platform_accounts_owner_access
on public.onecv_platform_accounts
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy onecv_sync_runs_owner_access
on public.onecv_sync_runs
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.onecv_profiles from anon;
revoke all on public.onecv_profile_revisions from anon;
revoke all on public.onecv_platform_accounts from anon;
revoke all on public.onecv_sync_runs from anon;

grant select, insert, update, delete on public.onecv_profiles to authenticated;
grant select, insert on public.onecv_profile_revisions to authenticated;
grant select, insert, update, delete on public.onecv_platform_accounts to authenticated;
grant select, insert, update, delete on public.onecv_sync_runs to authenticated;

grant all on public.onecv_profiles to service_role;
grant all on public.onecv_profile_revisions to service_role;
grant all on public.onecv_platform_accounts to service_role;
grant all on public.onecv_sync_runs to service_role;

comment on table public.onecv_profiles is 'Canonical encrypted-in-transit 1CV profile payloads, one per authenticated user.';
comment on table public.onecv_profile_revisions is 'Immutable snapshots used for profile history and conflict recovery.';
comment on table public.onecv_platform_accounts is 'Marketplace profile references and sync state. Credentials and browser sessions are never stored.';
comment on table public.onecv_sync_runs is 'Auditable marketplace plan, fill, update, and explicit-submit runs.';
