-- Per-project sign-in (one row per project) + linked Supabase accounts
-- (many per project). Shown on the Summary tab for website/app projects.
-- Safe to re-run.

create table if not exists project_credentials (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null unique references projects(id) on delete cascade,
  username           text not null default '',
  password           text not null default '',
  verification_token text not null default '',
  sort               integer not null default 0,
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
  created_at   timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['project_credentials', 'project_supabase'] loop
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
