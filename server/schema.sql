-- Goh Betoch Bank IT Asset Inventory - MariaDB schema
-- Consolidated schema based on the feature-complete asset-management model.

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'register_user',
  phone VARCHAR(20),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS license_types (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS license_subtypes (
  id VARCHAR(36) PRIMARY KEY,
  license_type_id VARCHAR(36) NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (license_type_id) REFERENCES license_types(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE KEY idx_license_subtypes_unique (license_type_id, label)
);

CREATE TABLE IF NOT EXISTS device_types (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  icon VARCHAR(100),
  base_fields TEXT NOT NULL,
  required_base_fields TEXT NOT NULL,
  core_fields TEXT NOT NULL,
  required_core_fields TEXT NOT NULL,
  field_labels TEXT NOT NULL,
  fields TEXT NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS device_owners (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS server_owners (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS server_types (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS server_environments (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ip_subnets (
  id VARCHAR(36) PRIMARY KEY,
  prefix VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  notes TEXT,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS asset_models (
  id VARCHAR(36) PRIMARY KEY,
  target VARCHAR(20) NOT NULL,
  device_type VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  image LONGTEXT,
  notes TEXT,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_asset_models_target (target)
);

CREATE TABLE IF NOT EXISTS reminder_types (
  id VARCHAR(36) PRIMARY KEY,
  label VARCHAR(255) NOT NULL UNIQUE,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  created_by VARCHAR(36),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ip_addresses (
  id VARCHAR(36) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  hostname VARCHAR(255),
  department_id VARCHAR(36),
  ip_owner VARCHAR(255),
  mac_address VARCHAR(17),
  port INT,
  switch_port VARCHAR(50),
  switch_ip VARCHAR(45),
  patch_panel_port VARCHAR(50),
  access_switch_port VARCHAR(100),
  patch_panel_label VARCHAR(100),
  vlan VARCHAR(50),
  assigned_entity_type VARCHAR(30),
  assigned_entity_id VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  KEY idx_ip_department (department_id),
  KEY idx_ip_address (ip_address),
  KEY idx_ip_assignment (assigned_entity_type, assigned_entity_id)
);

CREATE TABLE IF NOT EXISTS pc_registrations (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50),
  hostname VARCHAR(255) NOT NULL,
  monitor_serial VARCHAR(255),
  asset_tag VARCHAR(255),
  service_tag VARCHAR(255),
  mac_address VARCHAR(17),
  product_key VARCHAR(255),
  cpu VARCHAR(255),
  memory_detail VARCHAR(255),
  generation_detail VARCHAR(255),
  ip_address VARCHAR(45),
  ip_address_id VARCHAR(36),
  owner_name VARCHAR(255),
  department_id VARCHAR(36),
  floor_number VARCHAR(50),
  switch_port_number VARCHAR(50),
  access_switch_ip VARCHAR(45),
  access_switch_name VARCHAR(255),
  patch_level_number VARCHAR(50),
  model_id VARCHAR(36),
  image LONGTEXT,
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (ip_address_id) REFERENCES ip_addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (model_id) REFERENCES asset_models(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE KEY idx_pc_asset_id (asset_id),
  KEY idx_pc_department (department_id),
  KEY idx_pc_ip_address (ip_address_id),
  KEY idx_pc_created (created_at)
);

CREATE TABLE IF NOT EXISTS licenses (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50),
  license_type VARCHAR(100) NOT NULL,
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
  UNIQUE KEY idx_licenses_asset_id (asset_id),
  KEY idx_licenses_created (created_at)
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50),
  device_type VARCHAR(255) NOT NULL,
  device_owner VARCHAR(255),
  device_model VARCHAR(255),
  hostname VARCHAR(255),
  ip_address VARCHAR(45),
  ip_address_id VARCHAR(36),
  serial_number VARCHAR(255),
  mac_address VARCHAR(17),
  location VARCHAR(255),
  rack_number VARCHAR(50),
  extra_data LONGTEXT,
  model_id VARCHAR(36),
  image LONGTEXT,
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (ip_address_id) REFERENCES ip_addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (model_id) REFERENCES asset_models(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE KEY idx_devices_asset_id (asset_id),
  KEY idx_devices_created (created_at)
);

CREATE TABLE IF NOT EXISTS servers (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50),
  server_type VARCHAR(100) NOT NULL,
  server_type_other VARCHAR(255),
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  ip_address_id VARCHAR(36),
  ssh_port INT DEFAULT 22,
  environment VARCHAR(100) NOT NULL,
  server_owner VARCHAR(100) NOT NULL,
  network_subnet VARCHAR(255),
  image LONGTEXT,
  ram VARCHAR(100),
  cpu VARCHAR(100),
  storage VARCHAR(100),
  os_release VARCHAR(255),
  host_location VARCHAR(255),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (ip_address_id) REFERENCES ip_addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE KEY idx_servers_asset_id (asset_id),
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

CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(36) PRIMARY KEY,
  asset_id VARCHAR(50),
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
  ip_address VARCHAR(45),
  notes TEXT,
  registered_by VARCHAR(36),
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE KEY idx_assets_asset_id (asset_id),
  KEY idx_assets_department (department_id),
  KEY idx_assets_created (created_at)
);

CREATE TABLE IF NOT EXISTS asset_id_counters (
  prefix VARCHAR(10) PRIMARY KEY,
  next_seq INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at VARCHAR(30) NOT NULL,
  used_at VARCHAR(30),
  created_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  KEY idx_password_reset_user (user_id),
  KEY idx_password_reset_expiry (expires_at)
);
