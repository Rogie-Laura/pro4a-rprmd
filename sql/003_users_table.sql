-- Custom login table: users (badge number + password + session)

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  rank text,
  full_name text not null,
  rank_fullname text generated always as (
    nullif(
      btrim(
        coalesce(nullif(btrim(rank), '') || ' ', '') ||
        coalesce(nullif(btrim(full_name), ''), '')
      ),
      ''
    )
  ) stored,
  badge_number text not null unique,
  office text,
  unit text,
  password text not null,
  role text not null check (
    role in ('stn_admin', 'phq_admin', 'rhq_admin', 'RPRMD_admin', 'super_admin')
  ),
  session text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_badge_number on public.users (badge_number);
create index if not exists idx_users_session on public.users (session) where session is not null;
create index if not exists idx_users_role on public.users (role);

alter table public.users enable row level security;

-- No public policies on users — login and CRUD handled server-side via service role

-- personnel_list: server validates session first, then uses service role for queries
drop policy if exists "personnel_select" on public.personnel_list;
drop policy if exists "personnel_insert" on public.personnel_list;
drop policy if exists "personnel_update" on public.personnel_list;
drop policy if exists "personnel_delete" on public.personnel_list;

-- Bootstrap user: PSSg Rogie J Laura (super_admin)
-- Password: 111111 (bcrypt hash)
insert into public.users (
  rank,
  full_name,
  badge_number,
  office,
  unit,
  password,
  role
)
values (
  'PSSg',
  'Rogie J Laura',
  '226609',
  'PRO4A',
  'RICTMD',
  '$2b$10$eIWlWiAv6vsoL.7oqW64fuv1FwlXh5N7JV.SN7z6JStJEODlZdrma',
  'super_admin'
)
on conflict (badge_number) do update set
  rank = excluded.rank,
  full_name = excluded.full_name,
  office = excluded.office,
  unit = excluded.unit,
  password = excluded.password,
  role = excluded.role,
  is_active = true,
  updated_at = now();
