-- Add project types: 3d_print, laser_engrave. Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = '3d_print'
  ) then
    alter type project_type add value '3d_print';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'laser_engrave'
  ) then
    alter type project_type add value 'laser_engrave';
  end if;
end $$;
