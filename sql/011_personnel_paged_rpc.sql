-- Server-side pagination + search + rank sort for the personnel list.
-- Returns only one page of rows plus the total count of matching rows,
-- so the dashboard no longer downloads the entire table on every load.

-- Normalize a raw rank string to a canonical rank code (mirrors rank-order.ts aliases).
create or replace function public.personnel_rank_code(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_raw is null then
    return null;
  end if;

  v := upper(regexp_replace(p_raw, '[^A-Za-z0-9]', '', 'g'));

  return case v
    when 'PAT' then 'PAT'
    when 'PATROLMAN' then 'PAT'
    when 'PATROLWOMAN' then 'PAT'
    when 'PCPL' then 'PCPL'
    when 'CORPORAL' then 'PCPL'
    when 'PSSG' then 'PSSG'
    when 'STAFFSERGEANT' then 'PSSG'
    when 'PMSG' then 'PMSG'
    when 'MASTERSERGEANT' then 'PMSG'
    when 'PSMS' then 'PSMS'
    when 'PCSGT' then 'PCSGT'
    when 'PCMS' then 'PCSGT'
    when 'CHIEFSERGEANT' then 'PCSGT'
    when 'PEMS' then 'PEMS'
    when 'PLT' then 'PLT'
    when 'PLIEUT' then 'PLT'
    when 'LIEUTENANT' then 'PLT'
    when 'PCPT' then 'PCPT'
    when 'CAPTAIN' then 'PCPT'
    when 'PMAJ' then 'PMAJ'
    when 'MAJOR' then 'PMAJ'
    when 'PLTCOL' then 'PLTCOL'
    when 'LTCOL' then 'PLTCOL'
    when 'PCOL' then 'PCOL'
    when 'COLONEL' then 'PCOL'
    when 'PBGEN' then 'PBGEN'
    when 'BRIGGEN' then 'PBGEN'
    when 'NUP' then 'NUP'
    when 'NONUNIFORMED' then 'NUP'
    when 'NONUNIFORMEDPERSONNEL' then 'NUP'
    else null
  end;
end;
$$;

-- High-to-low rank index (0 = highest rank). NUP is always last; unknown ranks sort after everything.
create or replace function public.personnel_rank_idx(p_rank text, p_rank_name text)
returns int
language plpgsql
immutable
as $$
declare
  v_code text;
begin
  v_code := public.personnel_rank_code(p_rank);

  if v_code is null and p_rank_name is not null then
    v_code := public.personnel_rank_code(split_part(btrim(p_rank_name), ' ', 1));
  end if;

  return case v_code
    when 'PBGEN' then 0
    when 'PCOL' then 1
    when 'PLTCOL' then 2
    when 'PMAJ' then 3
    when 'PCPT' then 4
    when 'PLT' then 5
    when 'PEMS' then 6
    when 'PCSGT' then 7
    when 'PSMS' then 8
    when 'PMSG' then 9
    when 'PSSG' then 10
    when 'PCPL' then 11
    when 'PAT' then 12
    when 'NUP' then 13
    else 999
  end;
end;
$$;

-- Paged listing. Sort = 'rank-asc' (lowest->highest) or 'rank-desc' (highest->lowest).
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
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit int := greatest(1, least(coalesce(p_limit, 250), 5000));
  v_offset int := greatest(0, coalesce(p_offset, 0));
begin
  with filtered as (
    select p.*
    from public.personnel_list p
    where
      (
        v_search is null
        or (
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
        ) ilike '%' || v_search || '%'
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

grant execute on function public.personnel_rank_code(text) to anon, authenticated, service_role;
grant execute on function public.personnel_rank_idx(text, text) to anon, authenticated, service_role;
grant execute on function public.list_personnel_rprmd_paged(text, text, text, int, int) to anon, authenticated, service_role;

-- Helps search + sort performance on larger tables.
create index if not exists idx_personnel_lname on public.personnel_list (lname);
create index if not exists idx_personnel_rank_name on public.personnel_list (rank_name);

notify pgrst, 'reload schema';
