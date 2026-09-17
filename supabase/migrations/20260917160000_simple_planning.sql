-- Simple Planning variant: a Pending/In Progress/Completed board, additive
-- alongside the existing 5-status Planning board. Nullable column on the
-- existing plan_items table; null means "not part of the simple board" so no
-- existing data or behavior changes for untouched project types.
-- Idempotent; safe to re-run.

do $$ begin
  create type simple_plan_status as enum ('pending', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

alter table plan_items add column if not exists simple_status simple_plan_status;
