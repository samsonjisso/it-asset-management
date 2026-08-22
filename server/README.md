# Server — refactored structure

This is a **structural-only** refactor of the original flat `server/`
folder into a layered `controllers / routes / middleware / utils`
structure. No logic, validation rules, route paths, roles, or response
shapes were changed — every file below is either copied verbatim or
split verbatim (same code, same order, just moved into a smaller file
with updated relative imports).

## File tree

```
server/
├── index.ts                     # process entry point (env, db init, listen, scheduler)
├── app.ts                       # builds the Express app (global middleware + route mounting)
├── types.ts                     # shared TypeScript interfaces/types
├── auth.test.ts                 # unit tests for requireRole + schema assertions
├── schema.sql / .env / .env.example / tsconfig.json   # unchanged
│
├── controllers/                 # request handlers (business logic), no routing concerns
│   ├── auth.controller.ts           # login, session, change-password
│   ├── authAdmin.controller.ts      # admin create-user, forgot/reset password
│   ├── profiles.controller.ts       # profile list/get/update/delete
│   ├── crudRead.controller.ts       # generic table list/get handlers
│   └── crudWrite.controller.ts      # generic table create/update/delete handlers
│
├── routes/                      # Express routers — wire URLs + middleware to controllers
│   ├── auth.routes.ts               # /api/auth/*
│   ├── profiles.routes.ts           # /api/profiles/*
│   ├── ip-check.routes.ts           # /api/ip/*
│   ├── crud.routes.ts               # createCrudRouter() factory
│   └── register.ts                  # mounts every generic CRUD table route onto the app
│
├── middleware/                  # unchanged from the original — already a good boundary
│   ├── common.ts, pcValidation.ts, licenseValidation.ts, deviceValidation.ts,
│   │   reminderValidation.ts, assetValidation.ts, ipAddressValidation.ts,
│   │   serverValidation.ts, departmentValidation.ts, departmentValidation.test.ts
│   └── ipAssociation.ts             # kept as-is (present in the original, unused by index.ts)
│
└── utils/                       # stateless helpers + infrastructure, no Express types
    ├── auth.ts                      # signToken / requireAuth / requireRole / role lists
    ├── db.ts                        # pool creation, env loading, nowIso, startup orchestration
    ├── dbSchema.ts                  # schema.sql bootstrap + calls migrations/triggers
    ├── dbMigrations.ts              # ensureColumn/ensureForeignKey/ensureUniqueIndex
    ├── dbTriggers.ts                # ip_addresses sync triggers
    ├── dbSeed.ts                    # config-table + default-admin seeding
    ├── mailer.ts                    # nodemailer wrapper
    ├── scheduler.ts                 # reminder email polling loop
    ├── ipSync.ts                    # IP <-> entity sync helpers
    ├── crudHelpers.ts               # getColumns/rowToJson/attachDepartment/attachIpRelations
    ├── assetId.ts                   # asset-id prefix + counter reservation
    └── ping.ts                      # IPv4 regex + ICMP ping helper
```

## Why each split was made

**`db.ts` (296 lines) → `db.ts` + `dbSchema.ts` + `dbMigrations.ts` +
`dbTriggers.ts` + `dbSeed.ts`.**
The original file mixed five distinct concerns — pool/env setup, schema
bootstrap, ~30 lines of column/FK/index migrations, two SQL triggers, and
config/admin seeding — in one 300-line file with deep nesting. Each concern
is now independently readable and under the line-count target. `db.ts`
keeps the pool + `nowIso()` and just orchestrates the others in the same
order the original ran them.

**`crud.ts` (332 lines) → `utils/crudHelpers.ts` + `utils/assetId.ts` +
`controllers/crudRead.controller.ts` + `controllers/crudWrite.controller.ts`
+ `routes/crud.routes.ts`.**
This was the single largest file and the one place "controller" logic and
"routing" were most tangled: row-shaping helpers, asset-id generation, and
five inline route handlers were all defined inside one factory function.
The handlers are now controller functions that take a small `CrudContext`
(`{ table, opts, columnsState }`, defined in `types.ts`) so they can live
outside the factory while still closing over the same mutable `columns`
state the original used (`columnsState.columns` replaces the original
`let columns: string[]` closure — same async population, same read timing).
`routes/crud.routes.ts` is now just the `createCrudRouter()` factory:
create the router, populate columns, wire auth/role middleware to the
imported handlers.

**`routes/auth.ts` (206 lines) → `controllers/auth.controller.ts` +
`controllers/authAdmin.controller.ts` + `routes/auth.routes.ts`.**
Split by concern: everyday session handlers (login/session/password
change) vs. admin/recovery flows (create-user, forgot/reset password),
each comfortably under the line target. `routes/auth.routes.ts` is now a
thin ~15-line map of path → middleware → handler.

**`routes/profiles.ts` (118 lines) → `controllers/profiles.controller.ts`
+ `routes/profiles.routes.ts`.** Same pattern: handlers vs. wiring.

**`routes/ip-check.ts` (38 lines) → `utils/ping.ts` +
`routes/ip-check.routes.ts`.** Small file, but the ping/IPv4-regex logic
is a reusable, side-effect-free utility, so it moved to `utils/` and the
route stayed a thin handler.

**`index.ts` (162 lines) → `index.ts` + `app.ts` +
`routes/register.ts`.** The original mixed process bootstrap (dotenv,
`db.js` side-effect import, `app.listen`) with ~110 lines of repetitive
route-mounting for every table. `app.ts` now owns "what the app looks
like" (global middleware + top-level routers), `routes/register.ts` owns
the repetitive per-table CRUD mounting (unchanged options/roles/order),
and `index.ts` is just the entry point: load env, trigger the `db.ts`
side effect, build the app, listen, start the scheduler. `index.ts` also
re-exports `app`, `createApp`, `createCrudRouter`, and everything from
`types.ts` as a barrel, so anything that previously could only reach
these through the flat `index.ts`/`crud.ts` files can still get them from
one place.

**`auth.ts` (root, 60 lines) → `utils/auth.ts`.** Small enough not to
split further, but moved into `utils/` since `signToken` /
`requireAuth` / `requireRole` are stateless helpers, not a controller or
route. `UserRole`, `AuthProfile`, `AuthContext` (and the `Express.Request`
augmentation) moved to the shared `types.ts` since they're imported by
almost every other module.

**`mailer.ts`, `ipSync.ts`, `scheduler.ts`** moved into `utils/` as-is —
each was already a single, cohesive, appropriately-sized concern; only
their imports (`./db.js` → `./db.js` within `utils/`, `./crud.js` →
`../types.js` for the `Row` type) were updated for the new depth.

**`middleware/*`** were left untouched — they were already one
well-scoped file per validator, mostly under 90 lines, and already lived
in their own folder. Only `ipAssociation.ts`'s import of `../db.js` was
updated to `../utils/db.js`.

## Import path changes

Everything that used to live at the `server/` root (`db.ts`, `crud.ts`,
`auth.ts`, `mailer.ts`, `ipSync.ts`, `scheduler.ts`) now lives one level
deeper, inside `utils/` or `controllers/`, so every `./x.js` import
that pointed at those files became `../utils/x.js` (or `../types.js` for
the moved type declarations). Two path constants inside `db.ts` also
needed fixing since they're resolved relative to the file's own location
at runtime: the `.env` path (`./​.env` → `../.env`) and the `schema.sql`
path (now passed in explicitly from `utils/db.ts` to `utils/dbSchema.ts`
as `../schema.sql`). Files that were already one level deep
(`routes/*.ts`, `middleware/*.ts`) mostly kept the same relative depth.

## Post-refactor change: asset registration removed

The generic `/api/assets` registration endpoint (a standalone "asset"
record type, separate from PCs/devices/servers/licenses) was removed
from `routes/register.ts` since it isn't used by the frontend. This
removed:

- The `app.use('/api/assets', validateAsset)` and
  `app.use('/api/assets', createCrudRouter('assets', {...}))` mounts.
- The `validateAsset` import in `routes/register.ts`.

**`middleware/assetValidation.ts` was intentionally left in place** (not
deleted) — `middleware/departmentValidation.test.ts` still imports and
tests `validateAsset` directly, and deleting the file would break that
test suite. It's simply no longer wired into any route, so it has zero
effect on the running API. Say the word if you'd also like the validator
and its test cases removed.

**`asset_models` was left untouched**, as requested — it's a separate
config-table entry inside the `CONFIG_TABLES` loop (mounted at
`/api/asset_models`) that backs the "model" dropdown used by PC/Device/
Server registration forms, not the removed asset-registration feature.

The underlying `assets` table in `schema.sql`, and the `'assets'` case in
`utils/assetId.ts`'s `assetTypeCode()`, were also left as-is — dropping a
database table is a destructive migration outside the scope of a route
change, and the unused code path in `assetId.ts` is harmless. Let me know
if you'd like those cleaned up too.

## What was *not* changed

- Route paths, HTTP methods, middleware order, and role arrays are
  identical to the original `index.ts`.
- Every validation rule (regexes, required fields, allowed enums) in
  `middleware/*Validation.ts` is untouched.
- The CRUD router's query-filter, insert/update/delete, and
  `afterInsert`/`afterUpdate`/`afterDelete` behavior is byte-for-byte the
  same logic, just relocated.
- `.env`, `.env.example`, `schema.sql`, and `tsconfig.json` are copied
  unchanged.
- `auth.test.ts` and `middleware/departmentValidation.test.ts` still
  import the same functions and assert the same behavior; only the
  `requireRole` import path was updated.
