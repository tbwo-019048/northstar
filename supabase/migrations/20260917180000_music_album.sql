-- Music project type: an Album Art tab (uploaded images, one can be set as
-- the project's icon) and a separate Album tab (song rows with lyrics/style/
-- an attached mp3), alongside the existing Features tab (still "Tracks").
-- Idempotent; safe to re-run.

create table if not exists album_art (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  url         text not null,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now()
);

create table if not exists album_tracks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default 'Untitled track',
  lyrics      text not null default '',
  style       text not null default '',
  mp3_url     text,
  mp3_name    text,
  mp3_size    integer,
  sort        integer not null default 0,
  environment text not null default 'staging',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_album_tracks_updated on album_tracks;
create trigger trg_album_tracks_updated before update on album_tracks
  for each row execute function set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['album_art', 'album_tracks'] loop
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

-- Storage buckets for the two upload types.
insert into storage.buckets (id, name, public)
values ('project-album-art', 'project-album-art', true), ('project-album-tracks', 'project-album-tracks', true)
on conflict (id) do nothing;

drop policy if exists "project album art public read" on storage.objects;
create policy "project album art public read" on storage.objects
  for select using (bucket_id = 'project-album-art');

drop policy if exists "project album art auth write" on storage.objects;
create policy "project album art auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-album-art')
  with check (bucket_id = 'project-album-art');

drop policy if exists "project album tracks public read" on storage.objects;
create policy "project album tracks public read" on storage.objects
  for select using (bucket_id = 'project-album-tracks');

drop policy if exists "project album tracks auth write" on storage.objects;
create policy "project album tracks auth write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-album-tracks')
  with check (bucket_id = 'project-album-tracks');
