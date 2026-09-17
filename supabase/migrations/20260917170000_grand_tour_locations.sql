-- Grand Tour's Locations tab: a table of locations (address/date/letter/
-- state), with the Planning tab showing the same rows as a Pending/Visited/
-- Submitted kanban. Idempotent; safe to re-run.

do $$ begin
  create type location_state as enum ('pending', 'visited', 'submitted');
exception when duplicate_object then null; end $$;

create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  address     text not null default '',
  visit_date  date,
  letter      text not null default '',
  state       location_state not null default 'pending',
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_locations_updated on locations;
create trigger trg_locations_updated before update on locations
  for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['locations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
