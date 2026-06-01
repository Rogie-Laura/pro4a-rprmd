-- Login RPC functions — connect app to users table (badge + password + session)
-- Requires: create extension if not exists pgcrypto with schema extensions;

create extension if not exists pgcrypto with schema extensions;

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

notify pgrst, 'reload schema';
