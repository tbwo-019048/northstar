-- projects.platforms — target OS/platforms for an "app" project, shown as
-- chips in the Summary tab. Idempotent; safe to re-run.
alter table projects add column if not exists platforms jsonb not null default '[]'::jsonb;
