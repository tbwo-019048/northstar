-- NORTHSTAR — keepalive ping table
--
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor). Safe to re-run.
--
-- Supabase pauses free-plan projects after a stretch of inactivity. The old
-- keepalive route just ran a SELECT; this table gives it a genuine, visible
-- write to make daily row instead - you can see it's working by looking at
-- the table, not just trusting a cron log.

create table if not exists public.keepalive_pings (
  id        bigint generated always as identity primary key,
  pinged_at timestamptz not null default now()
);

alter table public.keepalive_pings enable row level security;

-- The keepalive route uses the anon client, so this policy is load-bearing
-- here - without it every insert would be silently blocked.
drop policy if exists keepalive_pings_insert on public.keepalive_pings;
create policy keepalive_pings_insert on public.keepalive_pings
  for insert to anon, authenticated
  with check (true);

-- security definer so the prune runs regardless of which role's insert
-- fired it.
create or replace function public.prune_keepalive_pings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.keepalive_pings where pinged_at < now() - interval '90 days';
  return new;
end;
$$;

drop trigger if exists keepalive_pings_prune on public.keepalive_pings;
create trigger keepalive_pings_prune
  after insert on public.keepalive_pings
  execute function public.prune_keepalive_pings();
