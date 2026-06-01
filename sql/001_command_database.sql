-- PRO4A Command Database — Supabase setup
-- Database / project: command_database
-- Table: personnel_list
--
-- Division codes (NOT geographic regions):
--   R1 = RPRMD, R2 = RID, R3 = ROD, R4 = RLRDD, R5 = RCADD,
--   R6 = RCD, R7 = RIDMD, R8 = RETD, R9 = RPSMD, R10 = RICTMD

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  fullname text,
  badge_number text,
  role text not null,
  directorate text not null,
  division_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_badge_number
  on public.profiles (badge_number)
  where badge_number is not null;

create table if not exists public.personnel_list (
  id bigint generated always as identity primary key,
  "rank" text,
  fname text not null,
  mname text,
  lname text not null,
  qual text,
  rank_name text generated always as (
    nullif(
      btrim(
        coalesce(nullif(btrim("rank"), '') || ' ', '') ||
        coalesce(nullif(btrim(fname), '') || ' ', '') ||
        coalesce(nullif(btrim(mname), '') || ' ', '') ||
        coalesce(nullif(btrim(lname), '') || ' ', '') ||
        coalesce(nullif(btrim(qual), ''), '')
      ),
      ''
    )
  ) stored,
  designation text,
  badge_number text,
  office text,
  station text,
  birthdate date,
  status text not null default 'Active',
  disposition text,
  remarks text,
  gender text,
  email text,
  phone_number text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personnel_office on public.personnel_list (office);
create index if not exists idx_personnel_station on public.personnel_list (station);
create index if not exists idx_personnel_status on public.personnel_list (status);
create index if not exists idx_personnel_badge on public.personnel_list (badge_number);

alter table public.profiles enable row level security;
alter table public.personnel_list enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('Super Admin', 'Admin')
        and p.division_code = profiles.division_code
        and p.directorate = profiles.directorate
    )
  );

create policy "personnel_select"
  on public.personnel_list for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Super Admin', 'Admin')
    )
  );

create policy "personnel_insert"
  on public.personnel_list for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Super Admin', 'Admin')
    )
  );

create policy "personnel_update"
  on public.personnel_list for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Super Admin', 'Admin')
    )
  );

create policy "personnel_delete"
  on public.personnel_list for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('Super Admin', 'Admin')
    )
  );


-- Bootstrap first Super Admin (Supabase Dashboard → Auth → Add user first):
-- insert into public.profiles (id, fullname, badge_number, role, directorate, division_code)
-- select id, 'System Admin', 'ADMIN001', 'Super Admin', 'RPRMD', 'R1'
-- from auth.users where email = 'ADMIN001@pro4a.local';
