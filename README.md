# GBB IT Asset Inventory Management System

A full-stack web application built with **Next.js (App Router)** and **Express.js** for managing IT assets, devices, users, licenses, and infrastructure for Gohbeto Bank.

## Overview

This is a comprehensive IT asset management solution that provides:
- **Dashboard**: Central monitoring of all IT assets
- **Device Management**: PC and server registration and tracking
- **IP Management**: IP address allocation and availability checking
- **License Tracking**: Software license inventory and reminders
- **User Management**: User accounts and departmental organization
- **Backup Management**: Backup status and scheduling
- **Reporting**: Asset reports and audit trails
- **Role-Based Access Control**: Admin, Manager, Registered User, and Assessor roles

The application uses a modern frontend built with Next.js and React, backed by an Express.js API with SQLite database.

## Prerequisites

- **Node.js** 16+ and **npm** or **pnpm**
- **ping** binary (for IP availability checks) — standard on Linux, macOS, Windows
- Optional: **pnpm** for faster installs (configured in `pnpm-workspace.yaml`)

## Setup

### 1. Install Dependencies

```bash
npm install
# or with pnpm
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment files and customize as needed:

```bash
# Frontend configuration
cp .env.example .env.local

# Backend configuration
cp server/.env.example server/.env
```

By default, the API runs on `http://localhost:4000` and the frontend proxies requests to it.

## Running the Project

### Development Mode

Start both the Next.js frontend (port 3000) and Express API (port 4000) concurrently:

```bash
npm run dev
```

Then open your browser and navigate to:

```
http://localhost:3000
```

**Default Login Credentials:**
- Email: `admin@gohbetochbank.com`
- Password: `Admin@123`

⚠️ **Important**: Change these credentials after your first login.

### Production Build & Deployment

Build the application for production:

```bash
npm run build
```

Start the production server (runs Next.js and Express together):

```bash
npm start
```

#### Deploying the API to a Different Host

If you want to run the Express API on a separate server, configure these environment variables:

- **`API_PROXY_TARGET`**: URL of your API server (used at build time in `next.config.js`)
- **`NEXT_PUBLIC_API_URL`**: URL accessible to the frontend (used at runtime)

Example:
```bash
NEXT_PUBLIC_API_URL=https://api.example.com npm run build
npm start
```

## Architecture

### Frontend (Next.js)
- **App Router** with protected routes under `src/app/(app)/`
- **Authentication**: Client-side JWT stored in `localStorage`
- **Components**: Reusable UI components in `src/components/`
- **Views**: Page-specific logic in `src/views/`
- **Styling**: Tailwind CSS with custom configuration

### Backend (Express.js + SQLite)
- **Routing**: API endpoints organized in `server/routes/`
- **Database**: SQLite with schema in `server/schema.sql`
- **Authentication**: JWT-based auth in `server/auth.ts`
- **Scheduling**: Automated tasks in `server/scheduler.ts`
- **Mailing**: Email notifications via `server/mailer.ts`

## Key Features

- **IP Availability Check**: Real-time ping verification for IP addresses before assignment
- **Role-Based Access**: Admin, Manager, Registered User, and Assessor roles
- **Responsive Design**: Works on desktop and mobile devices
- **Data Export**: Reports and asset inventory exports
- **Audit Logging**: Track changes and user activities
- **Dark Mode Support**: User preference-aware styling

## Migration Notes (from Vite to Next.js)

This project was recently migrated from a Vite + React SPA to Next.js. Key changes:

- **Routing**: Real file-based routing instead of client-side state management
- **Backend**: TypeScript server (`server/` now uses `.ts` files, run with `tsx`)
- **Directory Structure**: `src/pages/` → `src/views/` to avoid Next.js auto-routing conflicts
- **Environment Variables**: Vite's `import.meta.env.VITE_API_URL` → Next.js's `process.env.NEXT_PUBLIC_API_URL`

For detailed migration information, see [MARIADB_MIGRATION.md](MARIADB_MIGRATION.md).
