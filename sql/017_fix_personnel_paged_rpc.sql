-- Fix personnel paged RPC: single overload, search without search_text dependency,
-- and office/station scope filters for RHQ/PHQ/Station admins.

drop function if exists public.list_personnel_rprmd_paged(text, text, text, int, int);
drop function if exists public.list_personnel_rprmd_paged(text, text, text, int, int, text, text);

create or replace function public.list_personnel_rprmd_paged(
  p_search text default '',
  p_view text default 'all',
  p_sort text default 'rank-desc',
  p_limit int default 250,
  p_offset int default 0,
  p_office text default null,
  p_station text default null
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
  v_office text := nullif(btrim(coalesce(p_office, '')), '');
  v_station text := nullif(btrim(coalesce(p_station, '')), '');
  v_limit int := greatest(1, least(coalesce(p_limit, 250), 5000));
  v_offset int := greatest(0, coalesce(p_offset, 0));
begin
  with filtered as (
    select p.*
    from public.personnel_list p
    where
      (
        v_search is null
        or lower(
          coalesce(p.badge_number, '') || ' ' ||
          coalesce(p.rank, '') || ' ' ||
          coalesce(p.rank_name, '') || ' ' ||
          coalesce(p.fname, '') || ' ' ||
          coalesce(p.mname, '') || ' ' ||
          coalesce(p.lname, '') || ' ' ||
          coalesce(p.qual, '') || ' ' ||
          coalesce(p.designation, '') || ' ' ||
          coalesce(p.office, '') || ' ' ||
          coalesce(p.station, '') || ' ' ||
          coalesce(p.remarks, '') || ' ' ||
          coalesce(p.email, '') || ' ' ||
          coalesce(p.phone_number, '')
        ) like '%' || v_search || '%'
      )
      and (
        v_office is null
        or lower(btrim(coalesce(p.office, ''))) = lower(v_office)
      )
      and (
        v_station is null
        or lower(btrim(coalesce(p.station, ''))) = lower(v_station)
      )
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

revoke execute on function public.list_personnel_rprmd_paged(text, text, text, int, int, text, text) from anon, authenticated;
grant execute on function public.list_personnel_rprmd_paged(text, text, text, int, int, text, text) to service_role;

notify pgrst, 'reload schema';
