-- Add project types: grand_tour, national_red_plaque, merch, red_knights,
-- updates, sorting, information, technical, research_development, tools.
-- Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'grand_tour'
  ) then
    alter type project_type add value 'grand_tour';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'national_red_plaque'
  ) then
    alter type project_type add value 'national_red_plaque';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'merch'
  ) then
    alter type project_type add value 'merch';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'red_knights'
  ) then
    alter type project_type add value 'red_knights';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'updates'
  ) then
    alter type project_type add value 'updates';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'sorting'
  ) then
    alter type project_type add value 'sorting';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'information'
  ) then
    alter type project_type add value 'information';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'technical'
  ) then
    alter type project_type add value 'technical';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'research_development'
  ) then
    alter type project_type add value 'research_development';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'tools'
  ) then
    alter type project_type add value 'tools';
  end if;
end $$;
