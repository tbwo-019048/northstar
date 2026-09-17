-- Concept graph: a free-form mind-map per project (manually placed nodes,
-- manually drawn edges) used as the Summary tab for "standard treatment"
-- project types. Idempotent; safe to re-run.

create table if not exists concept_nodes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null default 'New idea',
  x           numeric not null default 40,   -- 0..100, percent of canvas width
  y           numeric not null default 40,   -- 0..100, percent of canvas height
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_concept_nodes_updated on concept_nodes;
create trigger trg_concept_nodes_updated before update on concept_nodes
  for each row execute function set_updated_at();

create table if not exists concept_edges (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  from_node_id  uuid not null references concept_nodes(id) on delete cascade,
  to_node_id    uuid not null references concept_nodes(id) on delete cascade,
  sort          integer not null default 0,
  environment   text not null default 'staging',
  created_at    timestamptz not null default now()
);

-- Shared-workspace RLS: any authenticated user, full access.
do $$
declare t text;
begin
  foreach t in array array['concept_nodes', 'concept_edges'] loop
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
