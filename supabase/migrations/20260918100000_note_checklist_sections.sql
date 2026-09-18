-- Notes' checklist becomes sectional — multiple named checklists within one
-- note, instead of a single flat list. Additive: the old `checklist` column
-- stays (unused going forward) so no data is destroyed; the new column
-- defaults to empty for every existing note. Idempotent; safe to re-run.

alter table notes add column if not exists checklist_sections jsonb not null default '[]'::jsonb;
