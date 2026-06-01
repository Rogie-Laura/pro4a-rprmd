-- RUN THIS in Supabase SQL Editor to fix login connection
-- Creates users table, seed account, login RPC, and reloads API schema

create extension if not exists pgcrypto with schema extensions;

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

alter table public.users enable row level security;

-- Password hashed with pgcrypto (compatible with login_user crypt check)
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
  extensions.crypt('111111', extensions.gen_salt('bf')),
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

create or replace function public.login_user(p_badge text, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
  v_token text;
  v_badge text;
begin
  v_badge := upper(regexp_replace(trim(coalesce(p_badge, '')), '[^A-Za-z0-9]', '', 'g'));

  if v_badge = '' or coalesce(p_password, '') = '' then
    return json_build_object('ok', false, 'message', 'Badge number and password are required.');
  end if;

  select * into v_user
  from public.users
  where badge_number = v_badge
    and is_active = true;

  if not found then
    return json_build_object('ok', false, 'message', 'Invalid badge number or password.');
  end if;

  if extensions.crypt(p_password, v_user.password) is distinct from v_user.password then
    return json_build_object('ok', false, 'message', 'Invalid badge number or password.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.users
  set session = v_token,
      updated_at = now()
  where id = v_user.id;

  return json_build_object(
    'ok', true,
    'session_token', v_token,
    'user_id', v_user.id,
    'role', v_user.role
  );
end;
$$;

create or replace function public.get_user_by_session(p_session text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
begin
  if coalesce(p_session, '') = '' then
    return null;
  end if;

  select * into v_user
  from public.users
  where session = p_session
    and is_active = true;

  if not found then
    return null;
  end if;

  return json_build_object(
    'id', v_user.id,
    'rank', v_user.rank,
    'full_name', v_user.full_name,
    'rank_fullname', v_user.rank_fullname,
    'badge_number', v_user.badge_number,
    'office', v_user.office,
    'unit', v_user.unit,
    'role', v_user.role,
    'is_active', v_user.is_active
  );
end;
$$;

create or replace function public.logout_user(p_session text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if coalesce(p_session, '') = '' then
    return;
  end if;

  update public.users
  set session = null,
      updated_at = now()
  where session = p_session;
end;
$$;

grant usage on schema extensions to anon, authenticated, service_role;
grant execute on function public.login_user(text, text) to anon, authenticated, service_role;
grant execute on function public.get_user_by_session(text) to anon, authenticated, service_role;
grant execute on function public.logout_user(text) to anon, authenticated, service_role;

create or replace function public.hash_password(p_password text)
returns text
language sql
security definer
set search_path = extensions
as $$
  select extensions.crypt(p_password, extensions.gen_salt('bf'));
$$;

grant execute on function public.hash_password(text) to service_role;

create or replace function public.count_personnel_rprmd()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.personnel_list
  where division_code = 'R1'
    and directorate = 'RPRMD';
$$;

grant execute on function public.count_personnel_rprmd() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Verify (should return 1 row)
select badge_number, full_name, role from public.users where badge_number = '226609';
