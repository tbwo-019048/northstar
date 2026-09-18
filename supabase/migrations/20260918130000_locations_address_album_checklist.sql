-- Locations: "address" is now shown in the UI as "Name" and "letter" as
-- "Position" (no column rename needed - just relabelled), with a new
-- location_address column for the actual street address shown as "Address".
--
-- Album tracks: replaces the mp3-upload flow with three completion
-- checkboxes (mp3_generated/lyrics_finalised/style_finalised) - a track
-- counts as "done" once all three are ticked. mp3_url/mp3_name/mp3_size stay
-- so any already-uploaded files aren't dropped, just unused going forward.
--
-- Idempotent; safe to re-run.

alter table locations add column if not exists location_address text not null default '';

alter table album_tracks add column if not exists mp3_generated boolean not null default false;
alter table album_tracks add column if not exists lyrics_finalised boolean not null default false;
alter table album_tracks add column if not exists style_finalised boolean not null default false;
