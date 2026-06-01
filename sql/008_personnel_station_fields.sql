-- Align personnel_list fields: unit -> station

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'personnel_list'
      and column_name = 'unit'
  ) then
    alter table public.personnel_list rename column unit to station;
  end if;
end $$;

drop index if exists idx_personnel_unit;

create index if not exists idx_personnel_station on public.personnel_list (station);

notify pgrst, 'reload schema';
