-- Goh Betoch Bank IT Asset Inventory — MariaDB schema
--
-- This is a consolidated, from-scratch translation of the original
-- server/schema.sql (SQLite) PLUS every ALTER/backfill/migration step
-- that used to run at boot in server/db.js. Because MariaDB is being
-- adopted fresh here, all of that history is folded into one clean
-- "final shape" schema rather than replayed as sequential migrations —
-- there is no legacy MariaDB installation to be compatible with.
--
-- Notable MariaDB-specific decisions (documented inline where relevant):
--   * IDs are CHAR(36) UUIDs (generated in the application layer with
--     crypto.randomUUID(), same as before) rather than AUTO_INCREMENT.
--   * SQLite's TEXT-with-strftime-default timestamps become
--     DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3).
--   * SQLite's ad-hoc "0/1 INTEGER" booleans become real BOOLEAN
--     (TINYINT(1)) columns.
--   * JSON-encoded-as-TEXT columns (extra_data, permissions, fields,
--     base_fields, ...) become native JSON columns — MariaDB validates
--     they contain valid JSON on write.
--   * SQLite supports *partial* unique indexes (e.g.
--     "UNIQUE INDEX ... WHERE license_id IS NOT NULL"). MariaDB does not.
--     Columns that relied on this (pc_registrations.license_id/ip_id,
--     devices.ip_id) are therefore left as regular (non-unique) indexes
--     here, and the "at most one active link" rule is enforced in the
--     application layer instead (server/controllers/crudConfig.ts), which
--     is exactly where the original app already enforced it redundantly
--     anyway (see validatePcLicense/checkAndLinkIp in the original
--     server/index.js) — so behavior is unchanged for normal use, and
--     only a direct concurrent-write race loses a database-level guard.
--   * CHECK constraints are kept (MariaDB 10.2+ enforces them) but only
--     for values that are genuinely fixed and non-configurable; every
--     other "type" column (server_type, os_release, device_type, ...)
--     is intentionally NOT constrained here, because those are open,
--     admin-managed lists that live as rows in their own lookup table.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------
-- Users / auth
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor', 'reader', 'audit') NOT NULL DEFAULT 'reader',
  phone VARCHAR(50) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  -- NULL = unrestricted; otherwise a JSON array of module keys (see
  -- MODULE_KEYS in src/lib/constants.ts) this account is limited to.
  permissions JSON NULL,
  -- Exactly one row should have is_owner = TRUE at any time.
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_branch BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Customization / lookup tables (label -> machine code, admin-managed)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS license_types (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_license_types_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS license_subtypes (
  id CHAR(36) PRIMARY KEY,
  license_type_id CHAR(36) NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_license_subtypes_type FOREIGN KEY (license_type_id) REFERENCES license_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_license_subtypes_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_license_subtypes UNIQUE (license_type_id, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_license_subtypes_type ON license_subtypes(license_type_id);

CREATE TABLE IF NOT EXISTS device_types (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NULL,
  base_fields JSON NOT NULL,
  required_base_fields JSON NOT NULL,
  core_fields JSON NOT NULL,
  required_core_fields JSON NOT NULL,
  field_labels JSON NOT NULL,
  fields JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_device_types_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS device_owners (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_device_owners_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS server_owners (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_server_owners_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendors (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_vendors_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS server_types (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_server_types_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS server_environments (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_server_environments_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS os_releases (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_os_releases_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS host_locations (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_host_locations_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS floors (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_floors_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS access_switches (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_access_switches_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS access_switch_ips (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_access_switch_ips_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS patch_levels (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_patch_levels_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ip_subnets (
  id CHAR(36) PRIMARY KEY,
  prefix VARCHAR(64) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_ip_subnets_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_models (
  id CHAR(36) PRIMARY KEY,
  target ENUM('pc', 'device') NOT NULL,
  device_type VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NULL,
  image LONGTEXT NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_asset_models_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reminder_types (
  id CHAR(36) PRIMARY KEY,
  label VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_reminder_types_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single-row config for the Register New PC form's field set.
CREATE TABLE IF NOT EXISTS pc_form_fields (
  id CHAR(36) PRIMARY KEY,
  base_fields JSON NOT NULL,
  required_base_fields JSON NOT NULL,
  field_labels JSON NOT NULL,
  fields JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_pc_form_fields_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ip_form_fields (
  id CHAR(36) PRIMARY KEY,
  base_fields JSON NOT NULL,
  required_base_fields JSON NOT NULL,
  field_labels JSON NOT NULL,
  fields JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by CHAR(36) NULL,
  CONSTRAINT fk_ip_form_fields_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- IP Address Management (created before pc/devices, which reference it)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ip_addresses (
  id CHAR(36) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  subnet_id CHAR(36) NULL,
  hostname VARCHAR(255) NULL,
  department_id CHAR(36) NULL,
  ip_owner VARCHAR(255) NULL,
  mac_address VARCHAR(64) NULL,
  access_switch_port VARCHAR(100) NULL,
  patch_panel_label VARCHAR(100) NULL,
  status ENUM('unassigned', 'assigned', 'reserved', 'available', 'decommissioned') NOT NULL DEFAULT 'unassigned',
  notes TEXT NULL,
  extra_data JSON NULL,
  registered_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ip_addresses_subnet FOREIGN KEY (subnet_id) REFERENCES ip_subnets(id) ON DELETE SET NULL,
  CONSTRAINT fk_ip_addresses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_ip_addresses_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_ip_department ON ip_addresses(department_id);
CREATE INDEX idx_ip_status ON ip_addresses(status);

-- ---------------------------------------------------------------------
-- Licenses (referenced by pc_registrations.license_id)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS licenses (
  id CHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE,
  license_name VARCHAR(255) NULL,
  license_type VARCHAR(100) NOT NULL,
  license_subtype VARCHAR(255) NULL,
  vendor VARCHAR(255) NULL,
  license_key VARCHAR(512) NULL,
  number_of_licenses INT NULL,
  effective_date DATE NULL,
  expiry_date DATE NULL,
  alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  attachment LONGTEXT NULL,
  attachment_name VARCHAR(255) NULL,
  registered_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_licenses_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_licenses_created ON licenses(created_at);

-- ---------------------------------------------------------------------
-- PCs
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pc_registrations (
  id CHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE,
  hostname VARCHAR(255) NOT NULL,
  monitor_serial VARCHAR(255) NULL,
  asset_tag VARCHAR(255) NULL,
  service_tag VARCHAR(255) NULL,
  mac_address VARCHAR(64) NULL,
  product_key VARCHAR(255) NULL,
  cpu VARCHAR(255) NULL,
  memory_detail VARCHAR(255) NULL,
  generation_detail VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  owner_name VARCHAR(255) NULL,
  department_id CHAR(36) NULL,
  floor_number VARCHAR(100) NULL,
  switch_port_number VARCHAR(100) NULL,
  access_switch_ip VARCHAR(45) NULL,
  access_switch_name VARCHAR(255) NULL,
  patch_level_number VARCHAR(100) NULL,
  model_id CHAR(36) NULL,
  image LONGTEXT NULL,
  notes TEXT NULL,
  license_id CHAR(36) NULL,
  ip_id CHAR(36) NULL,
  registered_by CHAR(36) NULL,
  -- JSON-encoded Record<string,string> for admin-added custom PC fields
  -- (see pc_form_fields.fields).
  extra_data JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pc_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_pc_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL,
  CONSTRAINT fk_pc_ip FOREIGN KEY (ip_id) REFERENCES ip_addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_pc_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_pc_department ON pc_registrations(department_id);
CREATE INDEX idx_pc_created ON pc_registrations(created_at);
-- NOTE: "at most one PC per license/ip" is enforced in the app layer —
-- see the schema-level comment at the top of this file.
CREATE INDEX idx_pc_license_id ON pc_registrations(license_id);
CREATE INDEX idx_pc_ip_id ON pc_registrations(ip_id);

-- ---------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devices (
  id CHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE,
  device_type VARCHAR(100) NOT NULL,
  device_owner VARCHAR(100) NULL,
  department_id CHAR(36) NULL,
  device_model VARCHAR(255) NULL,
  hostname VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  serial_number VARCHAR(255) NULL,
  mac_address VARCHAR(64) NULL,
  location VARCHAR(255) NULL,
  rack_number VARCHAR(100) NULL,
  extra_data JSON NULL,
  model_id CHAR(36) NULL,
  image LONGTEXT NULL,
  notes TEXT NULL,
  ip_id CHAR(36) NULL,
  registered_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_devices_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_devices_ip FOREIGN KEY (ip_id) REFERENCES ip_addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_devices_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_devices_created ON devices(created_at);
CREATE INDEX idx_devices_ip_id ON devices(ip_id);

-- ---------------------------------------------------------------------
-- Servers
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS servers (
  id CHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE,
  server_type VARCHAR(100) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  ssh_port INT NOT NULL DEFAULT 22,
  environment VARCHAR(100) NOT NULL,
  server_owner VARCHAR(100) NOT NULL,
  network_subnet VARCHAR(100) NULL,
  image LONGTEXT NULL,
  vendor VARCHAR(255) NULL,
  ram VARCHAR(100) NULL,
  cpu VARCHAR(100) NULL,
  storage VARCHAR(100) NULL,
  os_release VARCHAR(100) NULL,
  host_location VARCHAR(100) NULL,
  notes TEXT NULL,
  registered_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_servers_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_servers_created ON servers(created_at);

-- ---------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reminders (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(255) NOT NULL,
  detail TEXT NULL,
  remind_at DATETIME(3) NOT NULL,
  alert_email VARCHAR(255) NULL,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  is_notified BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  license_id CHAR(36) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_reminders_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_reminders_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_reminders_license_id ON reminders(license_id);

-- ---------------------------------------------------------------------
-- Admin Change Notifications
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  action ENUM('update', 'delete') NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_type VARCHAR(100) NOT NULL,
  record_id CHAR(36) NULL,
  record_label VARCHAR(255) NULL,
  summary TEXT NOT NULL,
  actor_id CHAR(36) NULL,
  actor_name VARCHAR(255) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ---------------------------------------------------------------------
-- General IT Asset register (kept for parity with the original schema)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
  id CHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL,
  department_id CHAR(36) NULL,
  owner VARCHAR(255) NULL,
  location VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  hostname VARCHAR(255) NULL,
  serial_number VARCHAR(255) NULL,
  manufacturer VARCHAR(255) NULL,
  supplier VARCHAR(255) NULL,
  operating_system VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  notes TEXT NULL,
  registered_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_assets_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_assets_registered_by FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_created ON assets(created_at);

-- ---------------------------------------------------------------------
-- Meaningful asset-ID sequence counters (GBB-COMP-001, GBB-SRV-014, ...)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS asset_id_counters (
  prefix VARCHAR(20) PRIMARY KEY,
  next_seq INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
