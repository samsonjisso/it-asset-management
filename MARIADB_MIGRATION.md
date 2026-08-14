# SQLite to MariaDB Migration Guide

## Overview

The IT Asset Management application has been successfully converted from SQLite to MariaDB. This guide will help you set up and run the application with MariaDB.

## Changes Made

### 1. Dependencies Updated
- **Removed**: `better-sqlite3` (SQLite driver)
- **Added**: `mysql2` (MariaDB driver with promise-based API)

### 2. Database Connection (`server/db.ts`)
- Changed from synchronous SQLite connection to async MariaDB connection pool
- Uses `mysql2/promise` for async/await support
- Connects to MariaDB using environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### 3. Database Schema (`server/schema.sql`)
Key schema conversions:
- SQLite PRAGMA syntax → MariaDB syntax
- `INTEGER` (for booleans) → `TINYINT(1)`
- `TEXT` columns → `VARCHAR` with appropriate lengths
- `strftime()` function removed (timestamps handled by application)
- Indexes converted to MariaDB format
- Foreign key constraints updated for MariaDB syntax

### 4. API Layer (`server/crud.ts`)
- Converted all synchronous database operations to async/await
- Replaced `PRAGMA table_info()` with `INFORMATION_SCHEMA.COLUMNS` queries
- Updated all route handlers to be async functions
- Connection pooling with proper resource cleanup

### 5. Route Handlers
Updated files:
- `server/routes/auth.ts` - Login, session, password change endpoints
- `server/routes/profiles.ts` - User profile management
- `server/scheduler.ts` - Reminder email scheduler

All now use async/await with MariaDB connection pool.

## Setup Instructions

### 1. Install MariaDB

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install mariadb-server
sudo mysql_secure_installation
```

**On macOS (using Homebrew):**
```bash
brew install mariadb
mysql.server start
mysql_secure_installation
```

**On Windows:**
Download and install from https://mariadb.org/download/

### 2. Create Database and User

```bash
sudo mysql -u root -p

# In MySQL/MariaDB prompt:
CREATE DATABASE gbb_inventory;
CREATE USER 'gbb_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON gbb_inventory.* TO 'gbb_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` in the `server/` directory:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MariaDB credentials:

```env
PORT=4000
JWT_SECRET=your-long-random-string-here
DB_HOST=localhost
DB_PORT=3306
DB_USER=gbb_user
DB_PASSWORD=your_secure_password
DB_NAME=gbb_inventory
SEED_ADMIN_EMAIL=admin@gohbetochbank.com
SEED_ADMIN_PASSWORD=Admin@123
```

### 4. Install Dependencies

```bash
npm install
# or if using pnpm:
pnpm install
```

### 5. Start the Application

```bash
npm run dev
# or with pnpm:
pnpm run dev
```

The application will:
1. Connect to MariaDB
2. Create tables from `schema.sql` (if they don't exist)
3. Seed the default admin account (if it doesn't exist)
4. Start the Express server and Next.js frontend

## First Login

After the application starts, log in with:
- **Email**: `admin@gohbetochbank.com` (or custom value from `SEED_ADMIN_EMAIL`)
- **Password**: `Admin@123` (or custom value from `SEED_ADMIN_PASSWORD`)

**⚠️ Important**: Change this password immediately after first login.

## Migrating Data from SQLite

If you have existing data in SQLite, you'll need to export and import it:

### Export from SQLite
```bash
# SQLite export to CSV or SQL script
sqlite3 server/data/gbb_inventory.db ".mode csv" ".output backup.csv" "SELECT * FROM profiles;"
# Repeat for each table
```

### Import to MariaDB
```bash
# You can import the CSV files or manually migrate the data
# Make sure to adjust timestamps to ISO format (2024-01-01T12:00:00Z)
mysql -u gbb_user -p gbb_inventory < backup.sql
```

## Database Schema Notes

### Data Types
- **IDs**: `VARCHAR(36)` for UUID strings
- **Booleans**: `TINYINT(1)` (0 = false, 1 = true)
- **Timestamps**: `VARCHAR(30)` storing ISO 8601 format strings (managed by application)
- **Text fields**: `TEXT` for long content, `VARCHAR` for bounded strings

### Foreign Keys
All foreign keys are configured with `ON DELETE SET NULL` for safety.

### Indexes
The following indexes are created for performance:
- `idx_pc_department`, `idx_pc_created` - PC registrations
- `idx_licenses_created` - Licenses
- `idx_devices_created` - Devices  
- `idx_servers_created` - Servers
- `idx_reminders_remind_at` - Reminders (for scheduler)
- `idx_assets_department`, `idx_assets_created` - Assets
- `idx_ip_department`, `idx_ip_address` - IP addresses

## Troubleshooting

### Connection Refused
- Check that MariaDB is running: `sudo systemctl status mariadb`
- Verify credentials in `.env`
- Ensure database and user exist

### Schema Creation Failed
- Check MariaDB error logs: `/var/log/mysql/error.log`
- Verify the `gbb_inventory` database exists
- Check user permissions with: `SHOW GRANTS FOR 'gbb_user'@'localhost';`

### Async/Await Errors
- Ensure all database calls use `await`
- Make sure route handlers are marked as `async`
- Check TypeScript compilation for any errors

### Performance Issues
- Run `ANALYZE TABLE table_name;` to update statistics
- Check indexes: `SHOW INDEX FROM table_name;`
- Monitor slow queries: Enable slow query log in MariaDB

## Production Deployment

For production use:

1. **Use a secure password** - Generate a strong, random password
2. **Enable SSL/TLS** - Configure MariaDB with SSL connections
3. **Regular backups** - Set up automated database backups
4. **Connection pooling** - Current pool limit is 10 connections (adjust as needed)
5. **Monitor resources** - Set appropriate `max_connections` in MariaDB

### MariaDB Production Config Example
```ini
[mysqld]
max_connections = 200
max_allowed_packet = 64M
default_storage_engine = InnoDB
innodb_buffer_pool_size = 2G
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

## Support

For issues or questions about the migration:
1. Check MariaDB logs
2. Verify `.env` configuration
3. Ensure all dependencies are installed
4. Review error messages in the console output
