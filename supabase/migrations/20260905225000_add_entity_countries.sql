alter table public.projects
  add column if not exists countries jsonb not null default '[]'::jsonb;

alter table public.clients
  add column if not exists countries jsonb not null default '[]'::jsonb;

comment on column public.projects.countries is
  'Country names represented by this project; used by the Home activity globe.';

comment on column public.clients.countries is
  'Country names represented by this client; used by the Home activity globe.';
