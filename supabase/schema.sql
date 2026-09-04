-- NorthStar schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Shared-workspace model: every authenticated user can read/write all rows.
-- The "env token" gate is enforced client-side before the Supabase login form is shown.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type project_type as enum ('website', 'app', 'physical', 'written', 'other');
exception when duplicate_object then null; end $$;

-- Migration for a database created before 'website'/'app' existed: rename the
-- old 'software' label and add 'app'. Safe to re-run.
do $$
begin
  if exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'software'
  ) then
    alter type project_type rename value 'software' to 'website';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'app'
  ) then
    alter type project_type add value 'app';
  end if;
end $$;

do $$ begin
  create type todo_status as enum ('todo', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_priority as enum ('urgent', 'high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_status as enum ('active', 'completed', 'archived');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        project_type not null default 'website',
  summary     text default '',
  hours_worked numeric not null default 0,
  position    integer not null default 0,
  logo_url    text,
  github_repo text,                      -- "owner/repo" this project tracks
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table projects add column if not exists logo_url text;
alter table projects add column if not exists github_repo text;
drop trigger if exists trg_projects_updated on projects;
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Project users (people recorded inside a project — not auth users)
-- ---------------------------------------------------------------------------
create table if not exists project_people (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  username    text not null default '',
  name        text not null default '',
  password    text not null default '',
  position    text not null default '',
  notes       text not null default '',
  extra       jsonb not null default '{}'::jsonb, -- { [person_columns.id]: value }
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table project_people add column if not exists extra jsonb not null default '{}'::jsonb;
drop trigger if exists trg_people_updated on project_people;
create trigger trg_people_updated before update on project_people
  for each row execute function set_updated_at();

create table if not exists person_comments (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references project_people(id) on delete cascade,
  author      text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now()
);

-- Project-defined extra columns for the Users table (values live in
-- project_people.extra, keyed by this row's id).
create table if not exists person_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null default 'Column',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- To-do items
-- ---------------------------------------------------------------------------
create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default '',
  subtitle    text not null default '',
  type        text not null default 'feature',   -- feature | bug | chore | idea | ...
  priority    item_priority not null default 'medium',
  status      todo_status not null default 'todo',
  description text not null default '',
  attachments jsonb not null default '[]'::jsonb, -- [{ name, url }]
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_todos_updated on todos;
create trigger trg_todos_updated before update on todos
  for each row execute function set_updated_at();

create table if not exists todo_comments (
  id          uuid primary key default gen_random_uuid(),
  todo_id     uuid not null references todos(id) on delete cascade,
  author      text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Features (completed capabilities)
-- ---------------------------------------------------------------------------
create table if not exists features (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default '',
  description text not null default '',
  source      text not null default 'manual',   -- manual | pipeline
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Details (dynamic key/value grouped rows)
-- ---------------------------------------------------------------------------
create table if not exists details (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  section     text not null default 'General',  -- e.g. UI, Libraries, Materials, Metrics
  label       text not null default '',
  value       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Requests (future items attributed to a named person)
-- ---------------------------------------------------------------------------
create table if not exists requests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default '',
  subtitle    text not null default '',
  requested_by text not null default '',
  priority    item_priority not null default 'medium',
  status      todo_status not null default 'todo',
  notes       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_requests_updated on requests;
create trigger trg_requests_updated before update on requests
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Pipelines
-- ---------------------------------------------------------------------------
create table if not exists pipelines (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null default 'Pipeline',
  status       pipeline_status not null default 'active',
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists pipeline_items (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  body        text not null default '',
  done        boolean not null default false,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- App settings — a single shared row (e.g. the GitHub token used to fetch
-- commit history). Shared-workspace app: readable/writable by any signed-in
-- user, same as everything else here.
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id           text primary key default 'default',
  github_token text,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — shared workspace: any authenticated user, full access
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_people','person_comments','person_columns','todos','todo_comments',
    'features','details','requests','pipelines','pipeline_items','app_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_people','person_comments','person_columns','todos','todo_comments',
    'features','details','requests','pipelines','pipeline_items'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage — public bucket for project logos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

drop policy if exists "project logos public read" on storage.objects;
create policy "project logos public read" on storage.objects
  for select using (bucket_id = 'project-logos');

drop policy if exists "project logos auth write" on storage.objects;
create policy "project logos auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-logos')
  with check (bucket_id = 'project-logos');
