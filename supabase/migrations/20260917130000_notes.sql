-- Notes — global notepad. Each note has a rich text body (HTML, see
-- src/components/NoteEditor.tsx) and a separate checklist section (jsonb
-- array of ChecklistItem, see src/lib/types.ts). Idempotent; safe to re-run.

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

-- Shared-workspace RLS: any authenticated user, full access.
alter table notes enable row level security;
drop policy if exists "auth full access" on notes;
create policy "auth full access" on notes
  for all to authenticated using (true) with check (true);

-- Realtime.
do $$
begin
  alter publication supabase_realtime add table notes;
exception when duplicate_object then null;
end $$;
