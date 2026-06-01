-- Distinct rank, office, and unit (station) values from personnel_list
-- for user-management dropdowns.

create or replace function public.personnel_lookup_options()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with rank_rows as (
    select distinct btrim(rank) as value
    from public.personnel_list
    where rank is not null and btrim(rank) <> ''
  ),
  office_rows as (
    select distinct btrim(office) as value
    from public.personnel_list
    where office is not null and btrim(office) <> ''
  ),
  unit_rows as (
    select btrim(office) as office, btrim(station) as unit
    from public.personnel_list
    where office is not null and btrim(office) <> ''
      and station is not null and btrim(station) <> ''
    group by 1, 2
  )
  select json_build_object(
    'ranks', coalesce(
      (select json_agg(value order by value) from rank_rows),
      '[]'::json
    ),
    'offices', coalesce(
      (select json_agg(value order by value) from office_rows),
      '[]'::json
    ),
    'units_by_office', coalesce(
      (
        select json_object_agg(office, units order by office)
        from (
          select office, json_agg(unit order by unit) as units
          from unit_rows
          group by office
        ) grouped
      ),
      '{}'::json
    )
  );
$$;

revoke execute on function public.personnel_lookup_options() from anon, authenticated;
grant execute on function public.personnel_lookup_options() to service_role;

notify pgrst, 'reload schema';
