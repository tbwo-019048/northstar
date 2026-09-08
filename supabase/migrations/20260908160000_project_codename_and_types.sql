-- 1) projects.codename — an alternate label for a project, shown instead of the
--    real name when the Overview "Codenames" toggle is on.
-- 2) Two new project types: "mechanical" and "location".
-- Idempotent; safe to re-run.

alter table projects add column if not exists codename text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'mechanical'
  ) then
    alter type project_type add value 'mechanical';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'location'
  ) then
    alter type project_type add value 'location';
  end if;
end $$;
