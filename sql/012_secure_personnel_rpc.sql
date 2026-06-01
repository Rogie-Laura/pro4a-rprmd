-- Security + search performance hardening for the personnel list.
--
-- 1. Revoke direct access to the personnel data RPCs from anon/authenticated so
--    the public anon key can no longer read the whole table. The app now calls
--    these only from the server using the service-role key.
-- 2. Add a generated `search_text` column + pg_trgm GIN index so substring search
--    (ILIKE '%term%') stays fast on large tables instead of full-scanning.

-- --- 1. Lock down the data RPCs (keep service_role only) -------------------

revoke execute on function public.list_personnel_rprmd_paged(text, text, text, int, int) from anon, authenticated;
grant execute on function public.list_personnel_rprmd_paged(text, text, text, int, int) to service_role;

-- Older/no-longer-used readers — lock down too if they still exist.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'list_personnel_rprmd') then
    revoke execute on function public.list_personnel_rprmd() from anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where proname = 'count_personnel_rprmd') then
    revoke execute on function public.count_personnel_rprmd() from anon, authenticated;
  end if;
end $$;

-- --- 2. Fast trigram search ------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

alter table public.personnel_list
  add column if not exists search_text text
  generated always as (
    lower(
      coalesce(badge_number, '') || ' ' ||
      coalesce(rank, '') || ' ' ||
      coalesce(rank_name, '') || ' ' ||
      coalesce(fname, '') || ' ' ||
      coalesce(mname, '') || ' ' ||
      coalesce(lname, '') || ' ' ||
      coalesce(qual, '') || ' ' ||
      coalesce(designation, '') || ' ' ||
      coalesce(office, '') || ' ' ||
      coalesce(station, '') || ' ' ||
      coalesce(remarks, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone_number, '')
    )
  ) stored;

create index if not exists idx_personnel_search_trgm
  on public.personnel_list
  using gin (search_text extensions.gin_trgm_ops);

-- --- 3. Recreate the paged RPC to use search_text --------------------------

create or replace function public.list_personnel_rprmd_paged(
  p_search text default '',
  p_view text default 'all',
  p_sort text default 'rank-desc',
  p_limit int default 250,
  p_offset int default 0
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
  v_search text := lower(nullif(btrim(coalesce(p_search, '')), ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 250), 5000));
  v_offset int := greatest(0, coalesce(p_offset, 0));
begin
  with filtered as (
    select p.*
    from public.personnel_list p
    where
      (v_search is null or p.search_text like '%' || v_search || '%')
      and (
        p_view = 'all'
        or (
          p_view = 'on-duty'
          and (
            lower(coalesce(p.status, '')) = 'active'
            or lower(coalesce(p.status, '') || ' ' || coalesce(p.disposition, '')) like '%on duty%'
          )
        )
        or (
          p_view = 'schooling'
          and lower(coalesce(p.status, '') || ' ' || coalesce(p.disposition, '')) like '%school%'
        )
        or (
          p_view = 'on-leave'
          and lower(coalesce(p.status, '') || ' ' || coalesce(p.disposition, '')) like '%leave%'
        )
      )
  ),
  ranked as (
    select
      f.*,
      case
        when p_sort = 'rank-asc' and public.personnel_rank_idx(f.rank, f.rank_name) <= 12
          then 12 - public.personnel_rank_idx(f.rank, f.rank_name)
        else public.personnel_rank_idx(f.rank, f.rank_name)
      end as _idx,
      lower(coalesce(f.rank_name, f.lname)) as _name
    from filtered f
  ),
  page as (
    select *
    from ranked
    order by _idx, _name, id
    offset v_offset
    limit v_limit
  )
  select json_build_object(
    'total', (select count(*) from filtered),
    'records', coalesce(
      (
        select json_agg(
          json_build_object(
            'id', pg.id,
            'rank', pg.rank,
            'fname', pg.fname,
            'mname', pg.mname,
            'lname', pg.lname,
            'qual', pg.qual,
            'rank_name', pg.rank_name,
            'designation', pg.designation,
            'badge_number', pg.badge_number,
            'office', pg.office,
            'station', pg.station,
            'birthdate', pg.birthdate,
            'status', pg.status,
            'disposition', pg.disposition,
            'remarks', pg.remarks,
            'gender', pg.gender,
            'email', pg.email,
            'phone_number', pg.phone_number,
            'created_at', pg.created_at,
            'updated_at', pg.updated_at
          )
          order by pg._idx, pg._name, pg.id
        )
        from page pg
      ),
      '[]'::json
    )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.list_personnel_rprmd_paged(text, text, text, int, int) to service_role;

notify pgrst, 'reload schema';
