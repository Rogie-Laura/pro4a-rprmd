-- User management: badge_number, roles, profiles RLS for in-app admin

alter table public.profiles
  add column if not exists badge_number text,
  add column if not exists is_active boolean not null default true;

-- Backfill badge from auth email (R1001@pro4a.local -> R1001)
update public.profiles p
set badge_number = upper(split_part(u.email, '@', 1))
from auth.users u
where p.id = u.id
  and p.badge_number is null
  and u.email like '%@pro4a.local';

create unique index if not exists idx_profiles_badge_number
  on public.profiles (badge_number)
  where badge_number is not null;

-- Migrate legacy role name
update public.profiles
set role = 'Focal'
where role = 'RPRMD Focal';

-- Profiles RLS: admins can view users in same division
drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('Super Admin', 'Admin')
        and p.division_code = profiles.division_code
        and p.directorate = profiles.directorate
    )
  );

-- Personnel policies: Admin same access as Focal within division
-- (Super Admin already handled; Focal/Admin use division match — no change needed)
