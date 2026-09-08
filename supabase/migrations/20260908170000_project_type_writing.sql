-- New project type "writing". Idempotent; safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'writing'
  ) then
    alter type project_type add value 'writing';
  end if;
end $$;
