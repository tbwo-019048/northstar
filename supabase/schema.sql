-- NorthStar schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Shared-workspace model: every authenticated user can read/write all rows.
-- The "env token" gate is enforced client-side before the Supabase login form is shown.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type project_type as enum
    ('website', 'app', 'production', 'physical', 'mechanical', 'location', 'written', 'writing', 'game', 'novel', 'music', '3d_print', 'laser_engrave',
     'grand_tour', 'national_red_plaque', 'merch', 'red_knights', 'updates', 'sorting', 'information', 'technical', 'research_development', 'tools', 'other');
exception when duplicate_object then null; end $$;

-- Migration for a database created before 'website'/'app'/'production' existed:
-- rename the old 'software' label and add the newer values. Safe to re-run.
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

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'production'
  ) then
    alter type project_type add value 'production';
  end if;

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

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'writing'
  ) then
    alter type project_type add value 'writing';
  end if;

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

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'grand_tour'
  ) then
    alter type project_type add value 'grand_tour';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'national_red_plaque'
  ) then
    alter type project_type add value 'national_red_plaque';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'merch'
  ) then
    alter type project_type add value 'merch';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'red_knights'
  ) then
    alter type project_type add value 'red_knights';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'updates'
  ) then
    alter type project_type add value 'updates';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'sorting'
  ) then
    alter type project_type add value 'sorting';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'information'
  ) then
    alter type project_type add value 'information';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'technical'
  ) then
    alter type project_type add value 'technical';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'research_development'
  ) then
    alter type project_type add value 'research_development';
  end if;

  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'project_type' and e.enumlabel = 'tools'
  ) then
    alter type project_type add value 'tools';
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

do $$ begin
  create type plan_status as enum ('requested', 'in_progress', 'delayed', 'completed', 'failed');
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
  codename    text not null default '',
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
  github_repo_locked boolean not null default false, -- true = editable only from Settings
  verification_token   text,             -- app/website verification token, if any
  platform_project_id  text,             -- id of this project on its platform (e.g. Firebase/Vercel project id)
  public_token         text,
  private_token         text,
  position_colors jsonb not null default '{}'::jsonb,  -- { [position label]: hex } for Users cards
  priority_colors jsonb not null default '{}'::jsonb,  -- { [priority]: hex } for Requests/To-Do chips
  planning_prefs jsonb not null default '{}'::jsonb,   -- { wip: { [plan_status]: n }, swimlane } for the Planning board
  platforms   jsonb not null default '[]'::jsonb,       -- target OS/platforms for an 'app' project
  tech_stack  jsonb not null default '[]'::jsonb,       -- [techStack catalog id, ...] shown in Details
  countries   jsonb not null default '[]'::jsonb,       -- country names represented by this project
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table projects add column if not exists logo_url text;
alter table projects add column if not exists codename text not null default '';
alter table projects add column if not exists state text not null default 'concept';
alter table projects add column if not exists website_url text;
alter table projects add column if not exists test_site_url text;
alter table projects add column if not exists default_screenshot text;
alter table projects add column if not exists github_repo text;
alter table projects add column if not exists github_repo_locked boolean not null default false;
alter table projects add column if not exists verification_token text;
alter table projects add column if not exists platform_project_id text;
alter table projects add column if not exists public_token text;
alter table projects add column if not exists private_token text;
alter table projects add column if not exists position_colors jsonb not null default '{}'::jsonb;
alter table projects add column if not exists priority_colors jsonb not null default '{}'::jsonb;
alter table projects add column if not exists planning_prefs jsonb not null default '{}'::jsonb;
alter table projects add column if not exists platforms jsonb not null default '[]'::jsonb;
alter table projects add column if not exists tech_stack jsonb not null default '[]'::jsonb;
alter table projects add column if not exists countries jsonb not null default '[]'::jsonb;
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
  countries   jsonb not null default '[]'::jsonb,
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
  source_request_id uuid,                         -- the request a "Send to To-Do" button came from
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table todos add column if not exists source_request_id uuid;
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
  source      text not null default 'manual',   -- manual | pipeline | planning | todo
  source_plan_item_id uuid,                      -- FK added after plan_items exists (below)
  source_todo_id uuid,                            -- the to-do this feature was completed from
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table features add column if not exists source_plan_item_id uuid;
alter table features add column if not exists source_todo_id uuid;

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
  estimate_manual boolean not null default false, -- true once the estimate is typed by hand
  sort           integer not null default 0,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
alter table pipelines add column if not exists estimate_hours numeric not null default 0;
alter table pipelines add column if not exists estimate_manual boolean not null default false;

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
  estimate_hours numeric not null default 0,      -- optional per-point time; sums to the estimate
  source_todo_id uuid,                             -- the to-do an "Add to Pipeline" button came from
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table pipeline_items add column if not exists estimate_hours numeric not null default 0;
alter table pipeline_items add column if not exists source_todo_id uuid;

-- ---------------------------------------------------------------------------
-- Planning — a per-project timeline / kanban of planned work items, each with
-- its own comments and photos and a 0..10 priority.
-- ---------------------------------------------------------------------------
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

-- Workflow links: a Request auto-creates a plan item; accepting it (any status
-- but rejected/failed) auto-creates a To-Do; completing it auto-creates a
-- Feature. The FKs are added here, after plan_items exists.
alter table plan_items add column if not exists source_request_id uuid;
alter table todos      add column if not exists source_plan_item_id uuid;

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

-- ---------------------------------------------------------------------------
-- App settings — a single shared row (e.g. the GitHub token used to fetch
-- commit history). Readable by anyone signed in; writable by the Master
-- only (see is_master() below).
-- ---------------------------------------------------------------------------
create table if not exists app_settings (
  id           text primary key default 'default',
  github_token text,
  active_environment text not null default 'staging',
  updated_at   timestamptz not null default now()
);
alter table app_settings add column if not exists active_environment text not null default 'staging';

-- ---------------------------------------------------------------------------
-- Project templates — reusable starting points. Picking one in the New-project
-- form seeds details / features / to-dos / plan items / pipelines; a project
-- can also be captured as a template from its Settings tab.
-- ---------------------------------------------------------------------------
create table if not exists project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  description text not null default '',
  type        project_type,                          -- optional default project type
  payload     jsonb not null default '{}'::jsonb,     -- TemplatePayload (see src/lib/types.ts)
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_project_templates_updated on project_templates;
create trigger trg_project_templates_updated before update on project_templates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Notes — global notepad. Each note has a rich text body (HTML, see
-- src/components/NoteEditor.tsx) and a separate checklist section (jsonb
-- array of ChecklistItem, see src/lib/types.ts).
-- ---------------------------------------------------------------------------
create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  body        text not null default '',
  checklist   jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_notes_updated on notes;
create trigger trg_notes_updated before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Project links — symmetric "related projects", one row per unordered pair.
-- ---------------------------------------------------------------------------
create table if not exists project_links (
  a          uuid not null references projects(id) on delete cascade,
  b          uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
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

-- Lets any signed-in user set their OWN display name (members writes are
-- otherwise Master-only).
create or replace function set_my_display_name(new_name text)
returns void language sql security definer set search_path = public, auth as $$
  update members set display_name = coalesce(nullif(trim(new_name), ''), display_name)
  where email = (select email from auth.users where id = auth.uid());
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
    'features','details','requests','pipelines','pipeline_items','plan_items','plan_comments','project_screenshots','project_assets',
    'project_templates','project_links','notes'
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
    'features','details','requests','pipelines','pipeline_items','plan_items','plan_comments','project_screenshots','project_assets',
    'project_templates','project_links','notes'
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
values
  ('project-logos', 'project-logos', true),
  ('avatars', 'avatars', true),
  ('client-media', 'client-media', true)
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

drop policy if exists "client media public read" on storage.objects;
create policy "client media public read" on storage.objects
  for select using (bucket_id = 'client-media');

drop policy if exists "client media auth write" on storage.objects;
create policy "client media auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'client-media')
  with check (bucket_id = 'client-media');

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

insert into storage.buckets (id, name, public)
values ('project-album-art', 'project-album-art', true), ('project-album-tracks', 'project-album-tracks', true)
on conflict (id) do nothing;

drop policy if exists "project album art public read" on storage.objects;
create policy "project album art public read" on storage.objects
  for select using (bucket_id = 'project-album-art');

drop policy if exists "project album art auth write" on storage.objects;
create policy "project album art auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-album-art')
  with check (bucket_id = 'project-album-art');

drop policy if exists "project album tracks public read" on storage.objects;
create policy "project album tracks public read" on storage.objects
  for select using (bucket_id = 'project-album-tracks');

drop policy if exists "project album tracks auth write" on storage.objects;
create policy "project album tracks auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-album-tracks')
  with check (bucket_id = 'project-album-tracks');

-- ---------------------------------------------------------------------------
-- Per-project single active module: a project can be restricted to exactly
-- one of Pipeline/To-Do/Planning/Requests, switchable in its Settings tab.
-- Null (the default) means "legacy: show all four".
-- ---------------------------------------------------------------------------
do $$ begin
  create type project_active_module as enum ('pipeline', 'todo', 'planning', 'requests');
exception when duplicate_object then null; end $$;

alter table projects add column if not exists active_module project_active_module;

-- ---------------------------------------------------------------------------
-- Clients — a global directory (not scoped to one project), linkable to any
-- number of projects via project_clients.
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  company     text not null default '',
  photo_url   text,
  company_logo_url text,
  email_domain text not null default '',
  email       text not null default '',
  phone       text not null default '',
  notes       text not null default '',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table clients add column if not exists countries jsonb not null default '[]'::jsonb;
alter table clients add column if not exists photo_url text;
alter table clients add column if not exists company_logo_url text;
alter table clients add column if not exists email_domain text not null default '';
drop trigger if exists trg_clients_updated on clients;
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();

create table if not exists project_clients (
  project_id  uuid not null references projects(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, client_id)
);

-- A client can operate across several companies/brands, each with its own name,
-- logo and email domain. The legacy clients.company / company_logo_url /
-- email_domain columns are kept but no longer used by the app.
create table if not exists client_companies (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  name         text not null default '',
  logo_url     text,
  email_domain text not null default '',
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_client_companies_updated on client_companies;
create trigger trg_client_companies_updated before update on client_companies
  for each row execute function set_updated_at();
insert into client_companies (client_id, name, logo_url, email_domain, sort)
select c.id, c.company, c.company_logo_url, c.email_domain, 0
from clients c
where coalesce(c.company, '') <> ''
  and not exists (select 1 from client_companies cc where cc.client_id = c.id);

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

-- ---------------------------------------------------------------------------
-- Diagnostic mode — a shared `hidden` flag; hidden rows drop out of every
-- list unless the viewer has diagnostic mode on.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects', 'clients', 'email_accounts', 'todos', 'features', 'requests', 'plan_items'
  ] loop
    execute format('alter table %I add column if not exists hidden boolean not null default false', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Workspace state — all existing content begins in Staging. `projects.state`
-- remains the separate project-lifecycle field.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects', 'project_people', 'person_columns', 'env_vars', 'todos', 'features',
    'details', 'requests', 'pipelines', 'project_screenshots', 'project_assets',
    'pipeline_items', 'plan_items', 'project_templates', 'clients',
    'client_companies', 'email_groups', 'email_accounts'
  ] loop
    execute format(
      'alter table %I add column if not exists environment text not null default ''staging''', t);
    execute format('update %I set environment = ''staging'' where environment is null', t);
    begin
      execute format(
        'alter table %I add constraint %I check (environment in (''staging'', ''production''))',
        t, t || '_environment_check');
    exception when duplicate_object then null;
    end;
    execute format('create index if not exists %I on %I (environment)', t || '_environment_idx', t);
  end loop;
end $$;

alter table app_settings drop constraint if exists app_settings_active_environment_check;
alter table app_settings add constraint app_settings_active_environment_check
  check (active_environment in ('staging', 'production'));

do $$
declare t text;
begin
  foreach t in array array[
    'clients','client_companies','project_clients','email_groups','email_accounts'
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

-- ---------------------------------------------------------------------------
-- Project credentials — a website/app project's own sign-in (one row per
-- project) plus any Supabase accounts tied to it (many per project). Surfaced
-- on the Summary tab for website/app projects.
-- ---------------------------------------------------------------------------
create table if not exists project_credentials (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null unique references projects(id) on delete cascade,
  username           text not null default '',
  password           text not null default '',
  verification_token text not null default '',
  sort               integer not null default 0,
  environment        text not null default 'staging',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists trg_project_credentials_updated on project_credentials;
create trigger trg_project_credentials_updated before update on project_credentials
  for each row execute function set_updated_at();

create table if not exists project_supabase (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  email        text not null default '',
  password     text not null default '',
  project_name text not null default '',
  sort         integer not null default 0,
  environment  text not null default 'staging',
  created_at   timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['project_credentials', 'project_supabase'] loop
    execute format(
      'alter table %I add column if not exists environment text not null default ''staging''', t);
    begin
      execute format(
        'alter table %I add constraint %I check (environment in (''staging'', ''production''))',
        t, t || '_environment_check');
    exception when duplicate_object then null;
    end;
    execute format('create index if not exists %I on %I (environment)', t || '_environment_idx', t);
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

-- ---------------------------------------------------------------------------
-- Concept graph — a free-form mind-map per project (manually placed nodes,
-- manually drawn edges), used as the Summary tab for "standard treatment"
-- project types.
-- ---------------------------------------------------------------------------
create table if not exists concept_nodes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null default 'New idea',
  x           numeric not null default 40,
  y           numeric not null default 40,
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

-- ---------------------------------------------------------------------------
-- Simple Planning variant — a Pending/In Progress/Completed board, additive
-- alongside the existing 5-status Planning board. Null means "not part of
-- the simple board", so untouched project types are unaffected.
-- ---------------------------------------------------------------------------
do $$ begin
  create type simple_plan_status as enum ('pending', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

alter table plan_items add column if not exists simple_status simple_plan_status;

-- ---------------------------------------------------------------------------
-- Grand Tour's Locations tab: a table of locations (address/date/letter/
-- state), with the Planning tab showing the same rows as a Pending/Visited/
-- Submitted kanban.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Music project type: an Album Art tab (uploaded images, one can be set as
-- the project's icon) and a separate Album tab (song rows with lyrics/style/
-- an attached mp3), alongside the existing Features tab (still "Tracks").
-- ---------------------------------------------------------------------------
create table if not exists album_art (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  url         text not null,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now()
);

create table if not exists album_tracks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default 'Untitled track',
  lyrics      text not null default '',
  style       text not null default '',
  mp3_url     text,
  mp3_name    text,
  mp3_size    integer,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_album_tracks_updated on album_tracks;
create trigger trg_album_tracks_updated before update on album_tracks
  for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['album_art', 'album_tracks'] loop
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
