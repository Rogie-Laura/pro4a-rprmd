-- Dashboard RPC — no service role key needed for personnel count

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

notify pgrst, 'reload schema';
