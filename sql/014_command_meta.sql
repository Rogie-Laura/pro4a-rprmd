-- Lightweight freshness check for the command pull integration.
-- command_meta() lets the analytics platform poll cheaply and only pull the
-- full dataset when last_updated changes.

create or replace function public.command_meta()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from public.personnel_list),
    'last_updated', (select max(updated_at) from public.personnel_list),
    'checked_at', now()
  );
$$;

revoke execute on function public.command_meta() from anon, authenticated;
grant execute on function public.command_meta() to service_role;

-- Add last_updated to the stats payload as well.
create or replace function public.command_personnel_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from public.personnel_list),
    'last_updated', (select max(updated_at) from public.personnel_list),
    'by_status', coalesce((
      select json_agg(json_build_object('label', label, 'count', c) order by c desc)
      from (
        select coalesce(nullif(btrim(status), ''), 'Unknown') as label, count(*) as c
        from public.personnel_list
        group by 1
      ) s
    ), '[]'::json),
    'by_office', coalesce((
      select json_agg(json_build_object('label', label, 'count', c) order by c desc)
      from (
        select coalesce(nullif(btrim(office), ''), 'Unknown') as label, count(*) as c
        from public.personnel_list
        group by 1
      ) o
    ), '[]'::json),
    'by_rank', coalesce((
      select json_agg(json_build_object('label', label, 'count', c) order by c desc)
      from (
        select coalesce(nullif(btrim(rank), ''), 'Unknown') as label, count(*) as c
        from public.personnel_list
        group by 1
      ) r
    ), '[]'::json),
    'by_disposition', coalesce((
      select json_agg(json_build_object('label', label, 'count', c) order by c desc)
      from (
        select coalesce(nullif(btrim(disposition), ''), 'Unknown') as label, count(*) as c
        from public.personnel_list
        group by 1
      ) d
    ), '[]'::json),
    'generated_at', now()
  );
$$;

revoke execute on function public.command_personnel_stats() from anon, authenticated;
grant execute on function public.command_personnel_stats() to service_role;

notify pgrst, 'reload schema';
