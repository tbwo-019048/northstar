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
  state       text not null default 'concept',  -- concept|commenced|development|mvp|revised|final|support
  summary     text default '',
  hours_worked numeric not null default 0,
  position    integer not null default 0,
  logo_url    text,
  website_url text,                      -- live site link, shown in Summary
  test_site_url text,                    -- staging/test site link, shown in Summary
  default_screenshot text,               -- 'live' | 'test' | a project_screenshots.id
  github_repo text,                      -- "owner/repo" this project tracks
  verification_token   text,             -- app/website verification token, if any
  platform_project_id  text,             -- id of this project on its platform (e.g. Firebase/Vercel project id)
  public_token         text,
  private_token         text,
  position_colors jsonb not null default '{}'::jsonb,  -- { [position label]: hex } for Users cards
  priority_colors jsonb not null default '{}'::jsonb,  -- { [priority]: hex } for Requests/To-Do chips
  tech_stack  jsonb not null default '[]'::jsonb,       -- [techStack catalog id, ...] shown in Details
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table projects add column if not exists logo_url text;
alter table projects add column if not exists state text not null default 'concept';
alter table projects add column if not exists website_url text;
alter table projects add column if not exists test_site_url text;
alter table projects add column if not exists default_screenshot text;
alter table projects add column if not exists github_repo text;
alter table projects add column if not exists verification_token text;
alter table projects add column if not exists platform_project_id text;
alter table projects add column if not exists public_token text;
alter table projects add column if not exists private_token text;
alter table projects add column if not exists position_colors jsonb not null default '{}'::jsonb;
alter table projects add column if not exists priority_colors jsonb not null default '{}'::jsonb;
alter table projects add column if not exists tech_stack jsonb not null default '[]'::jsonb;
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
  avatar_url  text,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table project_people add column if not exists extra jsonb not null default '{}'::jsonb;
alter table project_people add column if not exists avatar_url text;
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
-- Environment variables (uploaded from a .env file, shown masked in Details)
-- ---------------------------------------------------------------------------
create table if not exists env_vars (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  key         text not null default '',
  value       text not null default '',
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
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  name           text not null default 'Pipeline',
  status         pipeline_status not null default 'active',
  estimate_hours numeric not null default 0,  -- added to projects.hours_worked on completion
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
alter table pipelines add column if not exists estimate_hours numeric not null default 0;

-- ---------------------------------------------------------------------------
-- Screenshots — manually uploaded, alongside the auto Live/Test Site
-- snapshots computed client-side from projects.website_url/test_site_url.
-- ---------------------------------------------------------------------------
create table if not exists project_screenshots (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  url         text not null,
  label       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assets — a link to a website, or an uploaded file.
-- ---------------------------------------------------------------------------
create table if not exists project_assets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null default 'link',  -- 'link' | 'file'
  label       text not null default '',
  url         text not null default '',
  file_name   text,
  file_size   bigint,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
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
-- commit history). Readable by anyone signed in; writable by the Master
-- only (see is_master() below).
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id           text primary key default 'default',
  github_token text,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Groups & members — app-level roles, separate from Supabase Auth accounts.
-- A member row maps a login (by email) to a group. The earliest-created
-- auth user is flagged is_master and is the only one who can edit member_groups,
-- members, or the GitHub token in app_settings. Creating the actual login
-- (email + password) still happens in the Supabase dashboard — this is
-- authorization on top of that, not account creation.
-- ---------------------------------------------------------------------------
create table if not exists member_groups (
  name        text primary key,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  display_name text not null default '',
  group_name   text not null default 'User' references member_groups(name),
  is_master    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_members_updated on members;
create trigger trg_members_updated before update on members
  for each row execute function set_updated_at();

insert into member_groups (name, permissions) values
  ('User', '{}'::jsonb),
  ('Admin', '{}'::jsonb),
  ('Advanced', '{}'::jsonb)
on conflict (name) do nothing;

-- Designate the earliest-created Supabase Auth user as Master (idempotent —
-- re-running never demotes an existing Master or duplicates a member row).
do $$
declare first_user record;
begin
  if not exists (select 1 from members where is_master) then
    select id, email into first_user from auth.users order by created_at asc limit 1;
    if first_user.email is not null then
      insert into members (email, display_name, group_name, is_master)
      values (first_user.email, split_part(first_user.email, '@', 1), 'Admin', true)
      on conflict (email) do update set is_master = true, group_name = 'Admin';
    end if;
  end if;
end $$;

create or replace function is_master() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from members m
    join auth.users u on u.email = m.email
    where u.id = auth.uid() and m.is_master
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — shared workspace: any authenticated user, full access
-- to project data. Groups/members/app_settings are readable by everyone
-- signed in but writable only by the Master.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_people','person_comments','person_columns','env_vars','todos','todo_comments',
    'features','details','requests','pipelines','pipeline_items','project_screenshots','project_assets'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;

  foreach t in array array['app_settings', 'member_groups', 'members'] loop
    execute format('alter table %I enable row level security', t);
    -- drop the old blanket policy from earlier schema versions, if present
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format('drop policy if exists "%s select" on %I', t, t);
    execute format('drop policy if exists "%s insert master" on %I', t, t);
    execute format('drop policy if exists "%s update master" on %I', t, t);
    execute format('drop policy if exists "%s delete master" on %I', t, t);
    execute format(
      'create policy "%s select" on %I for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s insert master" on %I for insert to authenticated with check (is_master())', t, t);
    execute format(
      'create policy "%s update master" on %I for update to authenticated using (is_master()) with check (is_master())', t, t);
    execute format(
      'create policy "%s delete master" on %I for delete to authenticated using (is_master())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_people','person_comments','person_columns','env_vars','todos','todo_comments',
    'features','details','requests','pipelines','pipeline_items','project_screenshots','project_assets'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;

  foreach t in array array['member_groups', 'members'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage — public buckets for project logos and person avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "project logos public read" on storage.objects;
create policy "project logos public read" on storage.objects
  for select using (bucket_id = 'project-logos');

drop policy if exists "project logos auth write" on storage.objects;
create policy "project logos auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-logos')
  with check (bucket_id = 'project-logos');

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars auth write" on storage.objects;
create policy "avatars auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

insert into storage.buckets (id, name, public)
values ('project-screenshots', 'project-screenshots', true), ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

drop policy if exists "project screenshots public read" on storage.objects;
create policy "project screenshots public read" on storage.objects
  for select using (bucket_id = 'project-screenshots');

drop policy if exists "project screenshots auth write" on storage.objects;
create policy "project screenshots auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-screenshots')
  with check (bucket_id = 'project-screenshots');

drop policy if exists "project assets public read" on storage.objects;
create policy "project assets public read" on storage.objects
  for select using (bucket_id = 'project-assets');

drop policy if exists "project assets auth write" on storage.objects;
create policy "project assets auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-assets')
  with check (bucket_id = 'project-assets');

-- ---------------------------------------------------------------------------
-- Clients — a global directory (not scoped to one project), linkable to any
-- number of projects via project_clients.
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  company     text not null default '',
  email       text not null default '',
  phone       text not null default '',
  notes       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_clients_updated on clients;
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();

create table if not exists project_clients (
  project_id  uuid not null references projects(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, client_id)
);

-- ---------------------------------------------------------------------------
-- Emails — accounts grouped into tabs (email_groups), each entry masked the
-- same way as a person's password.
-- ---------------------------------------------------------------------------
create table if not exists email_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Group',
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists email_accounts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references email_groups(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  domain      text not null default '',
  password    text not null default '',
  notes       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_email_accounts_updated on email_accounts;
create trigger trg_email_accounts_updated before update on email_accounts
  for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array[
    'clients','project_clients','email_groups','email_accounts'
  ] loop
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
