-- Topics — a separate feature cloned from Notes (see notes' own migration,
-- 20260917130000_notes.sql / 20260918100000_note_checklist_sections.sql):
-- same shape (rich text body + sectional checklists), its own table. Notes
-- itself is untouched.
--
-- Tags — Topics-only addition: a `tags` table plus a `topic_tags` join table
-- for many-to-many assignment, same pattern as project_clients.
--
-- projects.simple_mode — per-project display toggle (see show_mindmap for
-- the existing precedent of a per-project boolean opt-in).
--
-- Idempotent; safe to re-run.

create table if not exists topics (
  id                uuid primary key default gen_random_uuid(),
  title             text not null default '',
  body              text not null default '',
  checklist_sections jsonb not null default '[]'::jsonb,
  sort              integer not null default 0,
  environment       text not null default 'staging',
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_topics_updated on topics;
create trigger trg_topics_updated before update on topics
  for each row execute function set_updated_at();

create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  environment text not null default 'staging',
  created_at  timestamptz not null default now()
);

create table if not exists topic_tags (
  topic_id   uuid not null references topics(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, tag_id)
);

alter table projects add column if not exists simple_mode boolean not null default false;

-- Shared-workspace RLS: any authenticated user, full access.
do $$
declare t text;
begin
  foreach t in array array['topics', 'tags', 'topic_tags'] loop
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
