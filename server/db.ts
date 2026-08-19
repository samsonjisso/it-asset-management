import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve path directly to it-asset-management/server/.env
// Adjust relative path depending on where THIS current script file is located:
// - If this script is inside 'it-asset-management/server/src/db.ts' -> use '../.env'
// - If this script is inside 'it-asset-management/server/db.ts'     -> use './.env'
const envPath = path.resolve(__dirname, './.env'); 

config({ path: envPath });

// Verification log
console.log('DB Host loaded:', process.env.DB_HOST);

// Connection pool for MariaDB
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gbb_inventory',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database - create tables from schema
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    try {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      
      // Split schema by semicolons and execute each statement
      const statements = schema
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        await connection.execute(statement);
      }

      // Backward-compatible migrations for databases created by the older
      // Next.js/MariaDB version. These only add missing columns/indexes and
      // never drop existing data.
      const ensureColumn = async (table: string, column: string, definition: string) => {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, column]
        );
        if (Number((rows as any[])[0]?.c || 0) === 0) {
          await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
      };

      await ensureColumn('profiles', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');
      await ensureColumn('pc_registrations', 'asset_id', 'VARCHAR(50)');
      await ensureColumn('pc_registrations', 'cpu', 'VARCHAR(255)');
      await ensureColumn('pc_registrations', 'memory_detail', 'VARCHAR(255)');
      await ensureColumn('pc_registrations', 'generation_detail', 'VARCHAR(255)');
      await ensureColumn('pc_registrations', 'owner_name', 'VARCHAR(255)');
      await ensureColumn('pc_registrations', 'model_id', 'VARCHAR(36)');
      await ensureColumn('pc_registrations', 'image', 'LONGTEXT');
      await ensureColumn('pc_registrations', 'ip_address_id', 'VARCHAR(36)');
      await ensureColumn('licenses', 'asset_id', 'VARCHAR(50)');
      await ensureColumn('devices', 'asset_id', 'VARCHAR(50)');
      await ensureColumn('devices', 'extra_data', 'LONGTEXT');
      await ensureColumn('devices', 'model_id', 'VARCHAR(36)');
      await ensureColumn('devices', 'image', 'LONGTEXT');
      await ensureColumn('devices', 'ip_address_id', 'VARCHAR(36)');
      await ensureColumn('servers', 'asset_id', 'VARCHAR(50)');
      await ensureColumn('servers', 'network_subnet', 'VARCHAR(255)');
      await ensureColumn('servers', 'image', 'LONGTEXT');
      await ensureColumn('servers', 'ip_address_id', 'VARCHAR(36)');
      await ensureColumn('assets', 'asset_id', 'VARCHAR(50)');
      await ensureColumn('ip_addresses', 'access_switch_port', 'VARCHAR(100)');
      await ensureColumn('ip_addresses', 'patch_panel_label', 'VARCHAR(100)');
      await ensureColumn('ip_addresses', 'port', 'INT');
      await ensureColumn('ip_addresses', 'switch_port', 'VARCHAR(50)');
      await ensureColumn('ip_addresses', 'switch_ip', 'VARCHAR(45)');
      await ensureColumn('ip_addresses', 'patch_panel_port', 'VARCHAR(50)');
      await ensureColumn('ip_addresses', 'vlan', 'VARCHAR(50)');
      await ensureColumn('ip_addresses', 'assigned_entity_type', 'VARCHAR(30)');
      await ensureColumn('ip_addresses', 'assigned_entity_id', 'VARCHAR(36)');

      console.log('Database schema initialized and backward-compatible migrations applied');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Initialize on import
await initializeDatabase();

export function nowIso(): string {
  return new Date().toISOString();
}


async function seedConfigurationDefaults() {
  const connection = await db.getConnection();
  try {
    const ts = nowIso();
    const seed = async (table: string, rows: Record<string, any>[]) => {
      const [countRows] = await connection.execute(`SELECT COUNT(*) AS c FROM ${table}`);
      if (Number((countRows as any[])[0]?.c || 0) > 0) return;
      for (const row of rows) {
        const id = crypto.randomUUID();
        const cols = ['id', ...Object.keys(row), 'created_at', 'updated_at'];
        const vals = [id, ...Object.values(row), ts, ts];
        await connection.execute(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals);
      }
    };
    await seed('license_types', [
      { code:'operating_system', label:'Operating System License', notes:null },
      { code:'email_365', label:'Email / 365 License', notes:null },
      { code:'veam_backup', label:'Veeam Backup License', notes:null },
      { code:'vmware', label:'VMware / vCenter License', notes:null },
      { code:'other', label:'Other License', notes:null },
    ]);
    await seed('server_owners', [
      { code:'application', label:'Application' }, { code:'information_security', label:'Information Security' }, { code:'infrastructure_management', label:'Infrastructure Management' },
    ]);
    await seed('server_types', [
      { code:'redhat', label:'Red Hat' }, { code:'ubuntu', label:'Ubuntu' }, { code:'windows_server', label:'Windows Server' }, { code:'other', label:'Other' },
    ]);
    await seed('server_environments', [
      { code:'production', label:'Production' }, { code:'test', label:'Test' }, { code:'standby', label:'Standby' },
    ]);
    await seed('device_owners', [
      { code:'infrastructure_management', label:'Infrastructure Management' }, { code:'application_management', label:'Application Management' }, { code:'information_security', label:'Information Security' },
    ]);
    await seed('device_types', [
      { code:'network', label:'Network Device', icon:'Network', base_fields:'["ip_address","serial_number","mac_address","location","rack_number"]', required_base_fields:'[]', core_fields:'["device_owner","device_model","hostname"]', required_core_fields:'["device_owner","hostname"]', field_labels:'{}', fields:'[]' },
      { code:'physical_server', label:'Physical Server', icon:'Server', base_fields:'["ip_address","serial_number","mac_address","location","rack_number"]', required_base_fields:'[]', core_fields:'["device_owner","device_model","hostname"]', required_core_fields:'["device_owner","hostname"]', field_labels:'{}', fields:'[]' },
      { code:'storage_server', label:'Storage Server', icon:'Boxes', base_fields:'["ip_address","serial_number","mac_address","location","rack_number"]', required_base_fields:'[]', core_fields:'["device_owner","device_model","hostname"]', required_core_fields:'["device_owner","hostname"]', field_labels:'{}', fields:'[]' },
      { code:'access_switch', label:'Access Switch', icon:'Network', base_fields:'["ip_address","serial_number","mac_address","location","rack_number"]', required_base_fields:'[]', core_fields:'["device_owner","device_model","hostname"]', required_core_fields:'["device_owner","hostname"]', field_labels:'{}', fields:'[]' },
    ]);
    await seed('reminder_types', [{label:'License Expiry'},{label:'Maintenance'},{label:'Warranty'},{label:'Other'}]);
  } finally { connection.release(); }
}

await seedConfigurationDefaults();

// Seed a default administrator account on first run so the system is
// usable immediately after cloning the repo.
async function seedDefaultAdmin() {
  try {
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@gohbetochbank.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM profiles WHERE email = ?',
        [adminEmail]
      );

      if ((rows as any[]).length === 0) {
        const id = crypto.randomUUID();
        const hash = bcrypt.hashSync(adminPassword, 10);
        const ts = nowIso();

        await connection.execute(
          `INSERT INTO profiles (id, email, password_hash, full_name, role, phone, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'admin', NULL, 1, ?, ?)`,
          [id, adminEmail, hash, 'System Administrator', ts, ts]
        );

        console.log(`Seeded default admin account -> email: ${adminEmail}  password: ${adminPassword}`);
        console.log('IMPORTANT: change this password after your first login.');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to seed default admin:', error);
    throw error;
  }
}

await seedDefaultAdmin();
