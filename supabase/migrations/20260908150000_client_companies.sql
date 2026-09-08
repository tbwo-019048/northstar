-- Multiple companies per client. Moves the single clients.company /
-- company_logo_url / email_domain into a repeatable child table and backfills
-- existing rows. The legacy columns are left in place (unused by the app).
-- Idempotent; safe to re-run.

create table if not exists client_companies (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  name         text not null default '',
  logo_url     text,
  email_domain text not null default '',
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_client_companies_updated on client_companies;
create trigger trg_client_companies_updated before update on client_companies
  for each row execute function set_updated_at();

-- Backfill: one company row per client that has a legacy company name, once.
insert into client_companies (client_id, name, logo_url, email_domain, sort)
select c.id, c.company, c.company_logo_url, c.email_domain, 0
from clients c
where coalesce(c.company, '') <> ''
  and not exists (select 1 from client_companies cc where cc.client_id = c.id);

-- Shared-workspace RLS: any authenticated user, full access.
alter table client_companies enable row level security;
drop policy if exists "auth full access" on client_companies;
create policy "auth full access" on client_companies
  for all to authenticated using (true) with check (true);

-- Realtime.
do $$
begin
  alter publication supabase_realtime add table client_companies;
exception when duplicate_object then null;
end $$;
