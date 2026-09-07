# GBB IT Asset Inventory — Next.js + MariaDB

This is the original Vite/React + Express/SQLite asset-inventory app
(`gbb-dc-asset`), migrated to a single Next.js 16 (App Router)
application with a typed TypeScript API and MariaDB.

Read this file before you run anything — it tells you what changed,
what didn't, and the handful of judgment calls made along the way.

## What actually changed vs. the original

- **One process, one framework.** The Express server and the Vite
  frontend are now one Next.js app: the UI is the App Router tree in
  `src/app/(app)` and `src/app/login`; the API is Route Handlers under
  `src/app/api/**`.
- **Database:** SQLite (`better-sqlite3`) → **MariaDB**, via a typed
  `mysql2/promise` pool (`server/lib/db.ts`). See "Why not an ORM" below.
- **Backend and frontend are separated at the top level**, the same
  way the original project split `server/` from `src/` — not merged
  into one `src/` tree:
  - `server/controllers/` — `crudEngine.ts` (generic, typed CRUD engine)
    and `crudConfig.ts` (every table's specific business rules —
    duplicate checks, license/IP linking, Windows-license special
    case, etc. — ported line-for-line from the original
    `server/index.js`), plus `authController.ts`, `profilesController.ts`,
    `networkController.ts`, `notificationsController.ts`.
  - `server/middlewares/` — `withAuth.ts` (JWT auth + role/module checks),
    `validate.ts` (Zod body/query parsing).
  - `server/validators/` — one Zod schema file per table/endpoint group.
  - `server/lib/` — `db.ts` (MariaDB pool), `auth.ts`, `assetId.ts`,
    `constants.ts`, `http.ts`.
  - `server/db/` — `schema.sql`, `migrate.ts`, `seed.ts`.
  - `src/app/api/**/route.ts` is the **only** backend code that has to
    live under `src/` — Next.js requires Route Handlers to sit in the
    `app/` tree. Every one of those files is a thin adapter: it does
    nothing but call into `server/` (via the `@/server/*` path alias)
    and has no logic of its own. Everything else backend-related —
    business rules, validation, auth, the DB pool — lives in `server/`.
  - `src/` otherwise holds only the frontend: `app/` (pages + layouts),
    `components/`, `context/`, `pages/`, and the frontend-only half of
    `lib/` (`api.ts`, `supabase.ts`, `permissions.ts`, export/import
    helpers, ...).
- **Path aliases:** `@/*` → `./src/*` (frontend), `@/server/*` →
  `./server/*` (backend) — set in `tsconfig.json`. A file under
  `server/` importing another file under `server/` uses `@/server/...`;
  a route handler under `src/app/api` also uses `@/server/...` to reach
  business logic, and `@/...` only for the rare case it needs something
  from `src/` (it never does, in this codebase).
- **Validation:** every write goes through a Zod schema
  (`server/validators/*`) before it reaches business logic. See "Two
  layers of validation" below for why some schemas are intentionally
  loose.
- **Frontend:** `react-router-dom` isn't actually used anywhere in the
  original app (routing was a `useState('activePage')` switch in
  `App.tsx`, not a router) — that made the App Router migration mostly
  mechanical: every sidebar item became a real route under
  `src/app/(app)/<id>/page.tsx`, backed by `next/navigation`
  (`useRouter`, `usePathname`) instead of the old `onNavigate` prop
  drilling. All ~30 page components were moved with their business
  logic **untouched** — see "What in the frontend is unchanged" below.
- **Env vars:** the one `VITE_API_URL` became `NEXT_PUBLIC_API_URL`
  (`.env.example`). Standalone database scripts load `.env.local` first,
  then fall back to `.env`, matching Next.js local development behavior.

## What in the frontend is unchanged (on purpose)

`src/lib/supabase.ts` is a ~750-line shim the original app already had,
mimicking the old Supabase client's `.from(table).select()...` /
`.auth.signIn()` shape but calling the local REST API underneath
(`src/lib/api.ts`). Every page (`src/pages/*.tsx`) is written against
that shim, not against `fetch` directly. Because of that, **every page
component ports over verbatim** — the only edits were adding `'use
client'` and fixing the one Vite-only env var read. This is a
deliberate choice: rewriting 30 pages' data-fetching to a "cleaner"
pattern would touch far more surface area for zero behavior change,
and this app has no `getServerSideProps`/RSC data-fetching to migrate
to in the first place (see "SPA-behind-auth" below).

## Two layers of validation

- **Zod schemas** (`src/validators/*`) check *shape*: types, lengths,
  UUID format, enums. They're intentionally loose (`.passthrough()`
  on the object schemas) so that DB columns the client legitimately
  sends (like `registered_by`) aren't silently stripped before
  `crudConfig.ts` gets to see them.
- **`crudConfig.ts` hooks** check *business rules*: "a Windows license
  has no expiry date", "this MAC address is already registered to
  another PC", "this IP must fall inside its selected subnet", etc.
  These are a faithful line-for-line port of the original
  `server/index.js` — that logic is inherently conditional
  ("required unless X"), which a static Zod schema can't safely
  express without duplicating (and risking drifting from) the real
  rule. Config/lookup tables (`device_types`, `pc_form_fields`,
  `floors`, `ip_subnets`, `asset_models`, `license_subtypes`,
  `reminder_types`) get a loose `passthroughSchema` for the same
  reason — their real shape is admin-defined JSON.

## Why not an ORM (Prisma/Kysely) for the generic engine

The brief allowed either. The original app's own `server/crud.js` is a
**generic, runtime-introspecting** CRUD router (one function serving
25 different tables by reading `PRAGMA table_info` at request time).
A one-for-one, fully faithful port of that shape needs the same kind
of dynamic, string-keyed row access — which is exactly what a
compile-time-typed ORM like Prisma is designed to prevent you from
doing. So `crudEngine.ts` ports the original's approach directly:
`information_schema.columns` instead of `PRAGMA table_info`, an
async `mysql2` pool instead of synchronous `better-sqlite3`, dynamic
parameterized SQL instead of Prisma's generated client. **Type safety
lives at the boundary instead**: every route's request body is Zod-
validated, and every response shape is documented by the table's
config object. If you'd rather have Prisma-level typed models for
some tables going forward (e.g. hand-writing `licenses`/`servers`/
`pc_registrations` as real Prisma models while leaving the 15+ simple
lookup tables on the generic engine), that's a reasonable next step
and the two can coexist.

## SPA-behind-auth (a scoping decision, not an oversight)

Every route under `src/app/(app)` and `src/app/login` is a Client
Component (`'use client'`), same as the original was one big client-
rendered React tree. This was a deliberate choice for this migration:
the original app's session lives in `sessionStorage`/`localStorage`
(see the "remember me" comment in `src/lib/api.ts`), not a cookie, so
there's nothing for the server to read during SSR anyway — a page
would render its loading state either way. Route protection therefore
happens the same way it always did: client-side, in
`src/app/(app)/layout.tsx`, which mirrors the original `AppContent`'s
session/`must_change_password`/disabled-account checks and redirects
to `/login` via `next/navigation`. If you want real SSR route
protection later, the clean path is to switch login to set an
httpOnly cookie (in addition to or instead of the bearer token) and
add `middleware.ts` that reads it.

## MariaDB-specific decisions

See the comment block at the top of `db/schema.sql` for the full list;
briefly:
- IDs are `CHAR(36)` UUIDs generated in the app (`crypto.randomUUID()`),
  matching the original — no `AUTO_INCREMENT`.
- JSON-as-TEXT columns became native `JSON` columns.
- SQLite's **partial unique indexes** (`UNIQUE ... WHERE license_id IS
  NOT NULL`, used for "at most one PC per license/IP") have no MariaDB
  equivalent. Those became regular indexes, and the "at most one"
  rule is enforced in `crudConfig.ts` (`validatePcLicense`,
  `checkAndLinkIp`) — which is exactly where the original **also**
  enforced it, redundantly, at the application layer. Net effect:
  identical behavior for the app itself; a direct, concurrent raw-SQL
  write against the database could theoretically race past it, same
  risk profile as trusting app-layer validation generally.
- Asset-ID sequence reservation (`GBB-COMP-001`, ...) uses
  `SELECT ... FOR UPDATE` inside the same transaction as the insert,
  replacing `better-sqlite3`'s synchronous transaction.

## Light / dark mode

- `src/context/ThemeContext.tsx` — a `ThemeProvider` (mounted in
  `src/components/Providers.tsx`) with three modes: `light`, `dark`,
  `system`. Preference is saved to `localStorage` (`gbb_theme`) and
  applied as a `dark` class on `<html>` (`tailwind.config.js` has
  `darkMode: 'class'`).
- **No flash of the wrong theme on load:** `src/app/layout.tsx` inlines
  a tiny blocking `<script>` (`THEME_INIT_SCRIPT`, exported from
  `ThemeContext.tsx` so there's one source of truth for the logic) that
  reads `localStorage`/`prefers-color-scheme` and sets the `dark` class
  before first paint — this has to be a plain `<script>`, not a React
  effect, since a `useEffect` only runs after the initial render.
- `src/components/ThemeToggle.tsx` — the header control (sun/moon icon,
  toggles light↔dark on click; the small arrow opens a menu with the
  explicit "System" option). It's also embedded as a `menu-item` variant
  inside the user account dropdown in `Layout.tsx`.
- **Component coverage:** every page and component was ported with
  Tailwind's default gray palette (`bg-white`, `text-gray-800`,
  `border-gray-200`, etc. — ~700 occurrences across 50+ files). Hand-
  editing each one wasn't practical, so a script walked every `.tsx`
  file under `src/pages`, `src/components`, and `src/app`, and appended
  the matching `dark:` variant next to each occurrence — e.g.
  `bg-white` → `bg-white dark:bg-gray-900`, `text-gray-800`/`900` →
  `+ dark:text-gray-100`, `border-gray-200` → `+ dark:border-gray-700`.
  It skips anything with an opacity modifier (`bg-white/10`) since
  those are almost always intentional overlays on the brand-navy
  header, not page surfaces. A second pass did the same for the
  brand-tinted selected/hover states (`bg-brand-50` →
  `+ dark:bg-brand-900/40`, etc.) so the sidebar's active nav item and
  dropdown hover states look native in dark mode too, not washed-out.
- **This is a systematic heuristic pass, not a manual design review** —
  it gets every screen to a genuinely usable dark mode, but treat it as
  a first pass: skim through the app in dark mode and adjust anything
  that reads oddly (a handful of hardcoded `text-white`/`bg-black`
  one-offs outside the mapped token set wouldn't have been touched).

## Getting started

```bash
cp .env.example .env.local    # fill in DB credentials + JWT_SECRET
npm install
npm run db:migrate       # creates the database + applies db/schema.sql
npm run db:seed          # ensures the database exists + seeds starter data
npm run dev
```

`db:migrate` and `db:seed` can connect using the credentials in `.env.local`
or `.env`. Run migration before seeding on a fresh installation because the
migration creates the tables that the seed data requires. The seed command is
idempotent and can be run again safely after the initial setup.

Default admin login (change immediately in production): the email/
password from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local`
or `.env`
(defaults to `admin@gohbetochbank.com` / `Admin@123`).

`npm run typecheck` and `npm run lint` before shipping — this is a
large, hand-ported surface (25 tables, ~30 pages) and hasn't been run
through a real compiler/test pass in this environment.

## One asset that didn't come with the export

`src/components/GBBLogo.tsx` references `/assets/image.png` (i.e.
`public/assets/image.png`). That file wasn't present in the project
you uploaded — drop the actual logo file in `public/assets/` (the
folder is already created).

## File tree

```
server/                       <-- everything backend (mirrors the original server/)
  db/
    schema.sql                MariaDB DDL (consolidated, see comments at top)
    migrate.ts                 creates the database and applies schema.sql
    seed.ts                     ensures the database exists; default admin + starter data
  lib/
    db.ts                      environment loading, mysql2 pool + transaction helper
    auth.ts                    JWT, password rules, account lockout
    assetId.ts                  GBB-COMP-001-style ID generator
    constants.ts                roles / module keys / table->module map
    http.ts                      ApiError, JSON helpers, error-handling wrapper
  middlewares/
    withAuth.ts                  requireAuth / requireRole / requireModule
    validate.ts                  Zod body/query parsing
  validators/                    one Zod schema file per table/endpoint group
  controllers/
    crudEngine.ts                 generic list/get/create/update/delete engine
    crudConfig.ts                  all 25 tables' business rules + the registry
    authController.ts, profilesController.ts, networkController.ts,
    notificationsController.ts

src/                          <-- everything frontend (mirrors the original src/),
                                   plus the Route Handler files Next.js requires
                                   to live under app/
  app/
    api/**/route.ts             thin adapters only — call straight into server/,
                                 no business logic of their own. One route per
                                 table (list+create, [id]) plus
                                 auth/profiles/network/notifications/health.
    login/page.tsx
    (app)/layout.tsx             protected shell (sidebar + session gating)
    (app)/<id>/page.tsx          one per sidebar item (dashboard, pc, ip, ...)
    layout.tsx, page.tsx, globals.css
  components/, context/, pages/  ported from the original app, unchanged logic
  lib/
    api.ts, supabase.ts, permissions.ts, ...   frontend-only (unchanged from original)
```
