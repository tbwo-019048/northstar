-- Diagnostic mode: a shared `hidden` flag on the item tables. Rows flagged
-- hidden disappear from every list unless the viewer has diagnostic mode on.
-- Idempotent; safe to re-run.
do $$
declare t text;
begin
  foreach t in array array[
    'projects', 'clients', 'email_accounts', 'todos', 'features', 'requests', 'plan_items'
  ] loop
    execute format('alter table %I add column if not exists hidden boolean not null default false', t);
  end loop;
end $$;
