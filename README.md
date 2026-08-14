# GBB IT Asset Inventory (Next.js)

Migrated from a Vite + React SPA to Next.js (App Router). The Express +
better-sqlite3 backend is unchanged and still runs as a separate process;
Next.js proxies `/api/*` to it, the same role Vite's `server.proxy` used
to play.

## What changed

- **Routing**: the old single-page app switched "pages" with React state
  (`activePage` / `onNavigate`). Each page is now a real Next.js route:
  `/dashboard`, `/pc`, `/assets`, `/ip`, `/licenses`, `/devices`,
  `/servers`, `/reminders`, `/reports`, `/users`, `/departments`,
  `/backup`, `/about`, `/profile`, plus `/login`. `/` redirects to
  `/dashboard`.
- **Layout structure**:
  - `src/app/layout.tsx` — root HTML shell, wraps everything in
    `Providers` (Auth + Toast contexts).
  - `src/app/login/page.tsx` — public login route; redirects to
    `/dashboard` once signed in.
  - `src/app/(app)/layout.tsx` — auth guard for every protected route:
    shows the loading spinner, redirects to `/login` if unauthenticated,
    shows the "account disabled" screen if applicable, otherwise renders
    the sidebar (`components/Layout.tsx`) around the page.
  - `src/app/(app)/<route>/page.tsx` — one thin file per route that just
    renders the matching component from `src/views/`.
- **Old `src/pages/*` → `src/views/*`**: renamed because Next.js
  auto-routes anything under a top-level `pages/` (or `src/pages/`)
  directory as the legacy Pages Router. Contents are otherwise
  unchanged, aside from adding `"use client"` (they all use hooks,
  `localStorage`, or browser APIs).
- **`src/components/Layout.tsx`**: the sidebar/topbar now uses
  `next/link` and `usePathname()` for active-route highlighting and
  navigation instead of the old `activePage`/`onNavigate` props.
- **`src/lib/api.ts`**: `import.meta.env.VITE_API_URL` →
  `process.env.NEXT_PUBLIC_API_URL` (still defaults to same-origin
  `/api`).
- **`server/*` is now TypeScript** (`.js` → `.ts` throughout, including
  `routes/`). Run with [`tsx`](https://github.com/privatenumber/tsx) —
  no separate compile step, same as the old `node --watch`/`node`
  scripts just swapped for `tsx watch`/`tsx`. Typecheck it on its own
  with `npm run typecheck:server` (it has its own `server/tsconfig.json`,
  kept separate from the Next.js one since the two use different
  module resolution settings).
- **New: IP availability check (ping)**. `GET /api/ip/check-availability?ip=...`
  (in `server/routes/ip-check.ts`) pings the address server-side with a
  single 1-second-timeout ICMP echo (`execFile('ping', [...])` — no
  shell, so it's not injectable — plus a strict IPv4 regex check before
  that). Returns `{ available: false, message: "The IP is already
  assigned." }` if it responds, `{ available: true, message: "The IP
  is available." }` if it times out. Wired into the "Register/Edit IP
  Address" form on `/ip` as a **Check** button next to the IP field.
  Requires the `ping` binary on the host running the Express server
  (present on virtually all Linux/macOS/Windows systems; on a minimal
  Docker base image you may need `apt-get install -y iputils-ping`).
- **Not implemented (by request)**: automatic fetch of a PC's
  hostname/MAC/logged-in user during registration — browsers can't read
  that from the machine they're running on, so this was intentionally
  left out; those fields stay manual entry. The Admin/Editor/Reader/Audit
  role model from the requirements doc is also still pending — the app
  currently keeps its original four roles
  (`admin`/`manager`/`register_user`/`assessor`).
- **`server/index.js` (pre-TS)**: dropped the block that served a built
  `dist/` folder in production — the frontend is now its own Next.js
  server. The Express app only ever needs to serve `/api/*`.

Auth is still fully client-side (JWT in `localStorage`, checked in
`AuthContext`), so the `(app)` layout guard runs in the browser after
hydration, same as the old `App.tsx` gate — there's no server-side
session check or middleware.

## Running locally

```bash
npm install
cp .env.example .env.local        # optional, only if you need to override defaults
cp server/.env.example server/.env
npm run dev
```

This starts the Express API on `:4000` (via `tsx`) and Next.js on `:3000`
(`concurrently`, same as before). Visit `http://localhost:3000`.

Default seeded login: `admin@gohbetochbank.com` / `Admin@123` (change
after first login).

## Production

```bash
npm run build
npm start
```

`npm start` runs `next start` and the Express API side by side. If you
deploy the API on a different host, set `API_PROXY_TARGET` (build/runtime
env var for `next.config.js`'s rewrite) and/or `NEXT_PUBLIC_API_URL` to
point the frontend at it.
