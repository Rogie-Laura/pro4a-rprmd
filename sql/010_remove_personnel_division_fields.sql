-- Remove division_code and directorate from personnel_list (RPRMD-only app)

drop view if exists public.stats_personnel_by_division;

drop index if exists idx_personnel_division_code;
drop index if exists idx_personnel_division_directorate;
drop index if exists idx_personnel_directorate;

alter table public.personnel_list
  drop column if exists division_code,
  drop column if exists directorate;

create or replace function public.count_personnel_rprmd()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.personnel_list;
$$;

grant execute on function public.count_personnel_rprmd() to anon, authenticated, service_role;

create or replace function public.list_personnel_rprmd()
returns json
language sql
security definer
set search_path = public
as $$
  select coalesce(
    json_agg(row_to_json(p) order by p.lname, p.fname, p.id),
    '[]'::json
  )
  from (
    select
      id,
      rank,
      fname,
      mname,
      lname,
      qual,
      rank_name,
      designation,
      badge_number,
      office,
      station,
      birthdate,
      status,
      disposition,
      remarks,
      gender,
      email,
      phone_number,
      created_at,
      updated_at
    from public.personnel_list
    order by lname, fname, id
  ) p;
$$;

grant execute on function public.list_personnel_rprmd() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
