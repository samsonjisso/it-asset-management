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

const dbName = process.env.DB_NAME || 'gbb_inventory';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

// Create the database before opening a pool that selects it by default.
export const db = mysql.createPool({
  ...dbConfig,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize database - create tables from schema
async function initializeDatabase() {
  try {
    const bootstrap = await mysql.createConnection(dbConfig);
    try {
      const escapedDbName = dbName.replace(/`/g, '``');
      await bootstrap.execute(`CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\``);
    } finally {
      await bootstrap.end();
    }

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

      const ensureIpForeignKey = async (table: string, constraint: string) => {
        const [rows] = await connection.execute(
          `SELECT k.CONSTRAINT_NAME, r.DELETE_RULE
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
           JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
             ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
           WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
             AND k.COLUMN_NAME = 'ip_address_id' AND k.REFERENCED_TABLE_NAME = 'ip_addresses'`,
          [table]
        );
        const existing = (rows as any[])[0];
        if (existing && existing.DELETE_RULE !== 'SET NULL') {
          await connection.execute(`ALTER TABLE ${table} DROP FOREIGN KEY \`${existing.CONSTRAINT_NAME}\``);
        }
        if (!existing || existing.DELETE_RULE !== 'SET NULL') {
          await connection.execute(
            `ALTER TABLE ${table} ADD CONSTRAINT \`${constraint}\` FOREIGN KEY (ip_address_id) REFERENCES ip_addresses(id) ON DELETE SET NULL`
          );
        }
      };

      await ensureIpForeignKey('pc_registrations', 'fk_pc_registrations_ip_address');
      await ensureIpForeignKey('devices', 'fk_devices_ip_address');
      await ensureIpForeignKey('servers', 'fk_servers_ip_address');

      const ensureUniqueIndex = async (table: string, column: string, indexName: string) => {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) AS c
           FROM INFORMATION_SCHEMA.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
          [table, column]
        );
        if (Number((rows as any[])[0]?.c || 0) === 0) {
          await connection.execute(
            `ALTER TABLE ${table} ADD UNIQUE KEY \`${indexName}\` (\`${column}\`)`
          );
        }
      };

      await ensureUniqueIndex('ip_addresses', 'hostname', 'uq_ip_addresses_hostname');
      await ensureUniqueIndex('pc_registrations', 'hostname', 'uq_pc_registrations_hostname');
      await ensureUniqueIndex('devices', 'hostname', 'uq_devices_hostname');
      await ensureUniqueIndex('servers', 'hostname', 'uq_servers_hostname');

      await connection.execute('DROP TRIGGER IF EXISTS trg_ip_addresses_after_update');
      await connection.execute(`
        CREATE TRIGGER trg_ip_addresses_after_update
        AFTER UPDATE ON ip_addresses
        FOR EACH ROW
        BEGIN
          UPDATE pc_registrations
          SET ip_address = NEW.ip_address,
              hostname = COALESCE(NEW.hostname, hostname)
          WHERE ip_address_id = NEW.id;

          UPDATE devices
          SET ip_address = NEW.ip_address,
              hostname = COALESCE(NEW.hostname, hostname)
          WHERE ip_address_id = NEW.id;

          UPDATE servers
          SET ip_address = NEW.ip_address,
              hostname = COALESCE(NEW.hostname, hostname)
          WHERE ip_address_id = NEW.id;
        END
      `);

      await connection.execute('DROP TRIGGER IF EXISTS trg_ip_addresses_before_delete');
      await connection.execute(`
        CREATE TRIGGER trg_ip_addresses_before_delete
        BEFORE DELETE ON ip_addresses
        FOR EACH ROW
        BEGIN
          UPDATE pc_registrations
          SET ip_address = NULL, ip_address_id = NULL
          WHERE ip_address_id = OLD.id;

          UPDATE devices
          SET ip_address = NULL, ip_address_id = NULL
          WHERE ip_address_id = OLD.id;

          UPDATE servers
          SET ip_address = NULL, ip_address_id = NULL
          WHERE ip_address_id = OLD.id;
        END
      `);

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
