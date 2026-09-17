-- Per-project single active module: a project can be restricted to exactly
-- one of Pipeline/To-Do/Planning/Requests, switchable in its Settings tab.
-- Null (the default) means "legacy: show all four" — no behavior change for
-- any existing project unless the user explicitly opts in.
-- Idempotent; safe to re-run.

do $$ begin
  create type project_active_module as enum ('pipeline', 'todo', 'planning', 'requests');
exception when duplicate_object then null; end $$;

alter table projects add column if not exists active_module project_active_module;
