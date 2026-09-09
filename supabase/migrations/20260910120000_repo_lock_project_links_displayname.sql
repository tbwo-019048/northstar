-- 1) projects.github_repo_locked — a locked repo can't be edited from the
--    project's own Git tab (only from Settings).
-- 2) project_links — symmetric "related projects" (one row per unordered pair).
-- 3) set_my_display_name() — lets a non-Master set their own members.display_name.
-- Idempotent; safe to re-run.

alter table projects add column if not exists github_repo_locked boolean not null default false;

create table if not exists project_links (
  a          uuid not null references projects(id) on delete cascade,
  b          uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table project_links enable row level security;
drop policy if exists "auth full access" on project_links;
create policy "auth full access" on project_links
  for all to authenticated using (true) with check (true);
do $$
begin
  alter publication supabase_realtime add table project_links;
exception when duplicate_object then null;
end $$;

create or replace function set_my_display_name(new_name text)
returns void language sql security definer set search_path = public, auth as $$
  update members set display_name = coalesce(nullif(trim(new_name), ''), display_name)
  where email = (select email from auth.users where id = auth.uid());
$$;
