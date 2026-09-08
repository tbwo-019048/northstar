-- 1) New project type "production".
-- 2) Workflow links so a Request auto-flows Request -> Planning -> To-Do -> Features.
-- Idempotent; safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'production'
  ) then
    alter type project_type add value 'production';
  end if;
end $$;

alter table plan_items add column if not exists source_request_id uuid;
alter table todos      add column if not exists source_plan_item_id uuid;
alter table features   add column if not exists source_plan_item_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plan_items_source_request_fk') then
    alter table plan_items add constraint plan_items_source_request_fk
      foreign key (source_request_id) references requests(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'todos_source_plan_item_fk') then
    alter table todos add constraint todos_source_plan_item_fk
      foreign key (source_plan_item_id) references plan_items(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'features_source_plan_item_fk') then
    alter table features add constraint features_source_plan_item_fk
      foreign key (source_plan_item_id) references plan_items(id) on delete set null;
  end if;
end $$;
