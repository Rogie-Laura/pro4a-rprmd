-- Restore designation/remarks and update personnel list RPC

alter table public.personnel_list
  add column if not exists designation text,
  add column if not exists remarks text;

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
