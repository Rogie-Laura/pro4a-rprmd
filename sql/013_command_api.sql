-- Command integration API: outbound, read-only data access for
-- command.pro4a-1key.com (analytics platform).
--
-- This app exposes secured endpoints; the analytics platform pulls data using
-- an API key. Keys are stored hashed (sha256, computed in the app) so the raw
-- key is shown only once at creation.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_api_keys_hash on public.api_keys (key_hash) where is_active;

-- Lock the table down: only the service-role (which bypasses RLS) may touch it.
alter table public.api_keys enable row level security;

-- Aggregated analytics for the command dashboard.
create or replace function public.command_personnel_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from public.personnel_list),
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
