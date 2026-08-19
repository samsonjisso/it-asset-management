# Consolidated Asset Management Implementation

This project remains the **Next.js + Express + MariaDB** target application. Feature-rich registration workflows from `gbb-asset-new` were integrated into the existing Next.js structure.

## Implemented

- PC registration: CPU, memory, generation, model, owner, photo upload/preview.
- Device registration: dynamic device types/fields, owners, models, photo upload.
- Server registration: managed server types, owners, environments, subnet detection, photo upload.
- IP Management: access switch/port and patch-panel fields.
- Automatic IP association for PC/device/server registration and updates.
- Duplicate IP prevention through database uniqueness plus backend conflict checks.
- IP Management returns related PC/device/server information.
- Asset IDs generated as `GBB-<TYPE>-NNN` for supported asset records.
- Customization tables/routes: license types/subtypes, device types/owners, server owners/types/environments, IP subnets, asset models, reminder types.
- Reminder functionality retained and extended with reminder-type configuration.
- Login password show/hide.
- Remember-email functionality without storing passwords.
- Forgot-password and token-based reset flow.
- Session-expiration return-path handling.
- Top-bar global search and Create menu.
- Light / Dark / System theme with persisted preference and early theme initialization.
- Duplicate general asset-registration route redirected to the authoritative registration workflow.
- Database schema expanded with backward-compatible column migrations; existing records are not intentionally deleted.
- Forced password-change support for administrator-created accounts.

## SMTP configuration

Forgot-password emails require SMTP settings in `server/.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- optional `SMTP_SECURE`
- optional `SMTP_FROM`
- `APP_BASE_URL`

## Database migration

On server startup, `server/db.ts` creates missing tables and adds missing columns required by the consolidated model. Existing data is preserved. Back up the MariaDB database before applying the application update in production.

## Validation note

The source tree was checked for TypeScript/TSX parser errors. A full `npm ci` / Next.js production build could not be completed in this execution environment because dependency installation did not finish, so run the following in an environment with npm registry access before deployment:

```bash
npm ci
npm run typecheck
npm run typecheck:server
npm run build
```
