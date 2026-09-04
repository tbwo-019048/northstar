# NorthStar

A compact, card-free project console. React + Vite + Tailwind v4 + **VeloBits UI**, backed by
**Supabase** for auth, storage, autosave and cross-device sync.

Landing → login (env access token + Supabase email/password) → overview table of projects →
per-project tabs: **Summary, Features, Details, Requests, To-Do, Pipeline, Users, Git, Analysis,
Settings** (Summary opens first).

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
all tables, enums, a shared-workspace RLS policy (any authenticated user has full access), adds
every table to the `supabase_realtime` publication, and creates the public `project-logos` Storage
bucket. It's idempotent — safe to re-run any time you pull an update that changes the schema (e.g.
new project types, new columns).

## 3. Create a login

There is no self-serve signup. In the Supabase dashboard → **Authentication → Users → Add user**,
create an email/password user (disable "Auto Confirm" off, i.e. confirm it). Use those credentials
on the login screen. **The first account ever created becomes Master** (set automatically by
`schema.sql` — see "Members, groups & the Master role" below).

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
- **Users table** rows are edited in place: local per-row state buffers every field so nothing is
  written until focus actually leaves the row (tabbing between its own cells does not save early).
  Projects can add custom columns (stored in `person_columns`, values in `project_people.extra`).
- **Project logos** upload to the public `project-logos` Storage bucket (via `ProjectLogo`), shown
  in the project header, the table view and the grid view.
- **Overview views** — table / grouped-by-type / compact grid, toggled top-right (remembered in
  `localStorage`). Clicking anywhere in a row/tile opens the project. CSV export/import round-trips
  name, type, summary, hours worked and logo URL — import matches existing projects by name.
- **Pipelines** — pressing Enter inside a bullet commits it and inserts a new one right after,
  focused, so you can keep typing points without touching the mouse.
- **Git history** — add a GitHub personal access token once in **Settings** (gear icon in the
  header), then link a repo (`owner/repo`) on any project's **Git** tab to see its commit history,
  paginated, pulled straight from the GitHub REST API with that token. The token is stored in the
  `app_settings` table — see the security note below.

- **Users** are a compact card grid (photo + name) — click a card for a centered modal with
  username, position (color-coded per the project's Settings tab), a masked password field (click
  the eye to reveal), notes, custom fields and comments. Photos upload to the public `avatars`
  bucket.
- **Details** — for Website/App projects only, a Credentials & IDs section holds a platform project
  ID, verification token, public token and private token, each masked the same way as passwords.
- **Requests** priority dropdown keeps an explicit `bg-background` instead of `bg-transparent` —
  a transparent native `<select>` makes Chromium render its option popup with the OS default white
  background regardless of theme, which is unreadable in dark mode. Colors for each priority come
  from the project's Settings tab.
- **Git history** renders a branded commit graph (branches as chips at the top, a small SVG tree
  with parallel lanes for merges, in NorthStar blue) above the existing commit table.

## GitHub integration

- Token needs at least read access to the repo's contents/metadata (a fine-grained PAT scoped to
  just the repos you'll link is the least-privilege option; `public_repo` on a classic token also
  works for public repos).
- Only the **Master** can set or change it (see below); everyone else sees whether one is
  configured but not the value.
- Nothing is proxied through a server: commit history is fetched directly from
  `api.github.com` in the browser using the stored token.

## Members, groups & the Master role

Global **Settings** (gear icon in the header) has a Members & Groups section, separate from
Supabase Auth:

- `member_groups` — default groups `User`, `Admin`, `Advanced`, each with a small set of
  permission toggles. Only the toggles named in the UI are actually enforced anywhere (see below);
  the rest are descriptive for now.
- `members` — maps an email to a group. Adding someone here does **not** create their login; you
  still create the email/password account in the Supabase dashboard first (step 3 above), then add
  them here so the app knows their group.
- **Master** — `schema.sql` automatically flags the earliest-created Supabase Auth user as Master.
  Enforced by Postgres RLS (not just hidden in the UI): only the Master can INSERT/UPDATE/DELETE
  `member_groups`, `members`, or the GitHub token in `app_settings`. Everyone signed in can read
  all three.
