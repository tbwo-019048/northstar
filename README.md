# NorthStar

A compact, card-free project console. React + Vite + Tailwind v4 + **VeloBits UI**, backed by
**Supabase** for auth, storage, autosave and cross-device sync.

Landing → login (env access token + Supabase email/password) → overview table of projects →
per-project tabs: **Users, To-Do, Features, Details, Requests, Pipeline, Analysis**.

## 1. Configure environment

`.env` is already populated for the Supabase project you provided. Values used:

| var | meaning |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://tfjgrdxbqwlvafaeczpf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable key (safe for the browser) |
| `VITE_APP_ACCESS_TOKEN` | shared secret typed on the login screen before the Supabase form unlocks. Currently `northstar-dev` — change it. |

> The `sb_secret_…` key you shared is a **service-role** key. It is **not** used here and must
> never go in a `VITE_` variable — it would ship to every browser. Keep it server-side only.
> Consider rotating it in the Supabase dashboard since it was pasted into chat.

## 2. Create the database

Open the Supabase **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql). It creates
all tables, enums, a shared-workspace RLS policy (any authenticated user has full access) and adds
every table to the `supabase_realtime` publication.

## 3. Create a login

There is no self-serve signup. In the Supabase dashboard → **Authentication → Users → Add user**,
create an email/password user (disable "Auto Confirm" off, i.e. confirm it). Use those credentials
on the login screen.

## 4. Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 — enter the access token, then sign in.

## 5. Deploy (Vercel)

`vercel.json` sets the Vite framework preset and an SPA rewrite. Add the three `VITE_…` env vars
in the Vercel project settings, then deploy. Set the same values for Preview and Production.

## How it works

- **State** lives in Zustand stores (`src/store`). Every mutation updates local state optimistically
  then persists to Supabase. A debounced Postgres-changes subscription reloads a project when any of
  its tables change elsewhere, giving multi-device sync.
- **Autosave** — free-text fields (descriptions, notes, summary) use `useDebouncedSave`, which writes
  600 ms after you stop typing and again on unmount, showing a `saving / saved` hint.
- **To-Do drag & drop** — `@dnd-kit`; drop a row in the other table to change its state, reorder
  within a table to change priority order. Row click expands description, attachments and comments.
- **Pipelines** — multiple per project. Export bullet points to `.txt`; "Complete" moves every point
  into the Features list and archives the pipeline. Past pipelines stay viewable via the dropdown.
- **VeloBits** components are vendored under `src/components/ui/velobits/`; tokens come from
  `@velobitsio/tokens/theme.css` (imported in `src/index.css`). Theme toggle sets `.dark` on `<html>`.
