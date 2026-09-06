alter table public.clients add column if not exists photo_url text;
alter table public.clients add column if not exists company_logo_url text;
alter table public.clients add column if not exists email_domain text not null default '';

insert into storage.buckets (id, name, public)
values ('client-media', 'client-media', true)
on conflict (id) do nothing;

drop policy if exists "client media public read" on storage.objects;
create policy "client media public read" on storage.objects
  for select using (bucket_id = 'client-media');

drop policy if exists "client media auth write" on storage.objects;
create policy "client media auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'client-media')
  with check (bucket_id = 'client-media');
