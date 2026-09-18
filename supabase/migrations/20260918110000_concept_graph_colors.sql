-- Concept graph nodes and edges can each be given a color. Nullable —
-- null means "use the default styling". Idempotent; safe to re-run.

alter table concept_nodes add column if not exists color text;
alter table concept_edges add column if not exists color text;
