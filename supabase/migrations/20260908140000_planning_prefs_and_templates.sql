-- 1) projects.planning_prefs — per-project Planning-board WIP limits + swimlane choice.
-- 2) project_templates — reusable starting points that seed rows into a new project.
-- Idempotent; safe to re-run.

-- 1) Planning board preferences -------------------------------------------------
alter table projects add column if not exists planning_prefs jsonb not null default '{}'::jsonb;

-- 2) Project templates ---------------------------------------------------------
create table if not exists project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  description text not null default '',
  type        project_type,
  payload     jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_project_templates_updated on project_templates;
create trigger trg_project_templates_updated before update on project_templates
  for each row execute function set_updated_at();

-- Shared-workspace RLS: any authenticated user, full access.
alter table project_templates enable row level security;
drop policy if exists "auth full access" on project_templates;
create policy "auth full access" on project_templates
  for all to authenticated using (true) with check (true);

-- Realtime.
do $$
begin
  alter publication supabase_realtime add table project_templates;
exception when duplicate_object then null;
end $$;
