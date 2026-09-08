-- Planning — a per-project timeline / kanban of planned work items, each with
-- its own comments and photos and a 0..10 priority. Idempotent; safe to re-run.

do $$ begin
  create type plan_status as enum ('requested', 'in_progress', 'delayed', 'completed', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists plan_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default '',
  description text not null default '',
  status      plan_status not null default 'requested',
  priority    integer not null default 5,               -- 0..10
  start_date  date,
  due_date    date,
  photos      jsonb not null default '[]'::jsonb,        -- [{ url, caption }]
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_plan_items_updated on plan_items;
create trigger trg_plan_items_updated before update on plan_items
  for each row execute function set_updated_at();

create table if not exists plan_comments (
  id            uuid primary key default gen_random_uuid(),
  plan_item_id  uuid not null references plan_items(id) on delete cascade,
  author        text not null default '',
  body          text not null default '',
  created_at    timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['plan_items', 'plan_comments'] loop
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

insert into storage.buckets (id, name, public)
values ('plan-media', 'plan-media', true)
on conflict (id) do nothing;

drop policy if exists "plan media public read" on storage.objects;
create policy "plan media public read" on storage.objects
  for select using (bucket_id = 'plan-media');

drop policy if exists "plan media auth write" on storage.objects;
create policy "plan media auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'plan-media')
  with check (bucket_id = 'plan-media');
