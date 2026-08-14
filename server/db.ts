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
      
      console.log('Database schema initialized successfully');
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
