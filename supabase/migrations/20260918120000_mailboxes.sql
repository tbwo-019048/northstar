-- Emails page: a duplicate of the original Emails feature (now displayed as
-- "Login"), with its own separate tables so the two track different data.
-- Idempotent; safe to re-run.

create table if not exists mailbox_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Group',
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now()
);

create table if not exists mailbox_accounts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references mailbox_groups(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  domain      text not null default '',
  password    text not null default '',
  notes       text not null default '',
  hidden      boolean not null default false,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_mailbox_accounts_updated on mailbox_accounts;
create trigger trg_mailbox_accounts_updated before update on mailbox_accounts
  for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['mailbox_groups', 'mailbox_accounts'] loop
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
