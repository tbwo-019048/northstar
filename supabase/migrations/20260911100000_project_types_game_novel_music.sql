-- Add project types: game, novel, music. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'game'
  ) then
    alter type project_type add value 'game';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'novel'
  ) then
    alter type project_type add value 'novel';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'music'
  ) then
    alter type project_type add value 'music';
  end if;
end $$;
