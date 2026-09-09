-- Manual Request -> To-Do -> Pipeline / Feature flow links + per-point pipeline
-- time estimates. Idempotent; safe to re-run.
alter table pipeline_items add column if not exists estimate_hours numeric not null default 0;
alter table pipeline_items add column if not exists source_todo_id uuid;
alter table pipelines      add column if not exists estimate_manual boolean not null default false;
alter table todos          add column if not exists source_request_id uuid;
alter table features       add column if not exists source_todo_id uuid;
