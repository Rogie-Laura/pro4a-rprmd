-- Gate login by access_page: RPRMD, RLRDD, or BOTH (shared users table).

alter table public.users
  add column if not exists access_page text not null default 'RPRMD';

alter table public.users drop constraint if exists users_access_page_check;
alter table public.users add constraint users_access_page_check check (
  access_page in ('RPRMD', 'RLRDD', 'BOTH')
);

-- Backfill existing accounts.
update public.users
set access_page = 'BOTH'
where role = 'super_admin';

update public.users
set access_page = 'RLRDD'
where role in ('RLRDD_admin', 'stn_logistics', 'phq_logistics', 'rhq_logistics')
  and access_page = 'RPRMD';

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

  if coalesce(v_user.access_page, 'RPRMD') not in ('RPRMD', 'BOTH') then
    return json_build_object('ok', false, 'message', 'Your account is not allowed to sign in here.');
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
    'role', v_user.role,
    'access_page', v_user.access_page
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

  if coalesce(v_user.access_page, 'RPRMD') not in ('RPRMD', 'BOTH') then
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
    'access_page', v_user.access_page,
    'is_active', v_user.is_active
  );
end;
$$;

create or replace function public.rlrdd_login_user(p_badge text, p_password text)
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

  if coalesce(v_user.access_page, 'RPRMD') not in ('RLRDD', 'BOTH') then
    return json_build_object('ok', false, 'message', 'Your account is not allowed to sign in here.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.users
  set rlrdd_session = v_token,
      updated_at = now()
  where id = v_user.id;

  return json_build_object(
    'ok', true,
    'session_token', v_token,
    'user_id', v_user.id,
    'role', v_user.role,
    'access_page', v_user.access_page
  );
end;
$$;

create or replace function public.rlrdd_get_user_by_session(p_session text)
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
  where rlrdd_session = p_session
    and is_active = true;

  if not found then
    return null;
  end if;

  if coalesce(v_user.access_page, 'RPRMD') not in ('RLRDD', 'BOTH') then
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
    'access_page', v_user.access_page,
    'is_active', v_user.is_active
  );
end;
$$;

notify pgrst, 'reload schema';
