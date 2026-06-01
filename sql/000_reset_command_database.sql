-- Fix: run this FIRST if Step 2 failed with "generation expression is not immutable"
-- Then run 001_command_database.sql again (or use this file alone on a fresh project)

drop view if exists public.stats_personnel_by_division;
drop table if exists public.personnel_list cascade;
drop table if exists public.profiles cascade;
