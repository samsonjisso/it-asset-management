-- Goh Betoch Bank IT Asset Inventory - MariaDB schema
-- Converted from SQLite. Auth is handled locally, so the "profiles" table
-- also stores the password hash (it is never sent to the client).

-- Enable foreign key constraints
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'register_user'
    CHECK (role IN ('admin', 'manager', 'register_user', 'assessor')),
  phone VARCHAR(20),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  KEY idx_profiles_email (email)
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_branch TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT,
  created_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_departments_created (created_at)
);

CREATE TABLE IF NOT EXISTS pc_registrations (
  id VARCHAR(36) PRIMARY KEY,
  hostname VARCHAR(255) NOT NULL,
  monitor_serial VARCHAR(255),
  asset_tag VARCHAR(255),
  service_tag VARCHAR(255),
  mac_address VARCHAR(17),
  product_key VARCHAR(255),
  ip_address VARCHAR(15),
  department_id VARCHAR(36),
  floor_number VARCHAR(50),
  switch_port_number VARCHAR(50),
  access_switch_ip VARCHAR(15),
  access_switch_name VARCHAR(255),
  patch_level_number VARCHAR(50),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_pc_department (department_id),
  KEY idx_pc_created (created_at)
);

CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR(36) PRIMARY KEY,
  license_type VARCHAR(50) NOT NULL
    CHECK (license_type IN ('operating_system', 'email_365', 'veam_backup', 'vmware', 'other')),
  license_subtype VARCHAR(255),
  vendor VARCHAR(255),
  license_key VARCHAR(255),
  number_of_licenses INT,
  effective_date VARCHAR(30),
  expiry_date VARCHAR(30),
  alert_sent TINYINT(1) DEFAULT 0,
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_licenses_created (created_at)
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(36) PRIMARY KEY,
  device_type VARCHAR(255) NOT NULL,
  device_owner VARCHAR(50) NOT NULL
    CHECK (device_owner IN ('infrastructure_management', 'application_management', 'information_security')),
  device_model VARCHAR(255),
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(15),
  serial_number VARCHAR(255),
  mac_address VARCHAR(17),
  location VARCHAR(255),
  rack_number VARCHAR(50),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_devices_created (created_at)
);

CREATE TABLE IF NOT EXISTS servers (
  id VARCHAR(36) PRIMARY KEY,
  server_type VARCHAR(50) NOT NULL
    CHECK (server_type IN ('redhat', 'ubuntu', 'windows_server', 'other')),
  server_type_other VARCHAR(255),
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(15),
  ssh_port INT DEFAULT 22,
  environment VARCHAR(50) NOT NULL
    CHECK (environment IN ('production', 'test', 'standby')),
  server_owner VARCHAR(50) NOT NULL
    CHECK (server_owner IN ('application', 'information_security', 'infrastructure_management')),
  ram VARCHAR(100),
  cpu VARCHAR(100),
  storage VARCHAR(100),
  os_release VARCHAR(255),
  host_location VARCHAR(255),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_servers_created (created_at)
);

CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  reminder_type VARCHAR(100) NOT NULL,
  detail TEXT,
  remind_at VARCHAR(30) NOT NULL,
  alert_email VARCHAR(255),
  email_sent TINYINT(1) DEFAULT 0,
  is_notified TINYINT(1) DEFAULT 0,
  is_dismissed TINYINT(1) DEFAULT 0,
  created_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_reminders_remind_at (remind_at)
);

-- General IT Asset register (asset name/type/owner/manufacturer/supplier/OS etc.)
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(36) PRIMARY KEY,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(255) NOT NULL,
  department_id VARCHAR(36),
  owner VARCHAR(255),
  location VARCHAR(255),
  model VARCHAR(255),
  hostname VARCHAR(255),
  serial_number VARCHAR(255),
  manufacturer VARCHAR(255),
  supplier VARCHAR(255),
  operating_system VARCHAR(255),
  ip_address VARCHAR(15),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_assets_department (department_id),
  KEY idx_assets_created (created_at)
);

-- IP Address Management (IPAM): the bank's registered IP addresses
CREATE TABLE IF NOT EXISTS ip_addresses (
  id VARCHAR(36) PRIMARY KEY,
  ip_address VARCHAR(15) NOT NULL UNIQUE,
  hostname VARCHAR(255),
  department_id VARCHAR(36),
  ip_owner VARCHAR(255),
  mac_address VARCHAR(17),
  status VARCHAR(50) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'reserved', 'available', 'decommissioned')),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_ip_department (department_id),
  KEY idx_ip_address (ip_address)
);
