-- The free-form mind-map moved off the Summary tab (which now shows only the
-- state gauge for "standard treatment" types) onto its own optional tab,
-- toggled per project in Settings. Off by default for every project.
-- Idempotent; safe to re-run.

alter table projects add column if not exists show_mindmap boolean not null default false;
