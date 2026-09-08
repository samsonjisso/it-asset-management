/**
 * Applies db/schema.sql against the configured MariaDB database.
 * Run with: npm run db:migrate
 *
 * Safe to re-run: every statement in schema.sql uses CREATE TABLE IF
 * NOT EXISTS, and the plain CREATE INDEX statements are skipped here
 * if they already exist (MariaDB has no "CREATE INDEX IF NOT EXISTS").
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'gbb_inventory';
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.changeUser({ database: dbName });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

  // Split on statement-terminating semicolons that are not inside a
  // comment line. schema.sql has no semicolons inside string literals,
  // so a simple split is safe here.
  const statements = sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s*--.*(?:\r?\n|$)/gm, '').trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (err: any) {
      // 1061 = ER_DUP_KEYNAME (index already exists) — fine on re-run
      // since CREATE INDEX has no IF NOT EXISTS in MariaDB.
      if (err?.errno === 1061) continue;
      console.error('Failed statement:\n', statement.slice(0, 200), '...');
      throw err;
    }
  }

  // CREATE TABLE IF NOT EXISTS does not repair an older pc_form_fields
  // table. Ensure every field used by the PC customization page exists.
  const [pcColumns] = await connection.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pc_form_fields'`,
    [dbName]
  );
  const existingPcColumns = new Set(pcColumns.map((row) => row.COLUMN_NAME));
  const pcJsonColumns = ['base_fields', 'required_base_fields', 'field_labels', 'fields'];
  for (const column of pcJsonColumns) {
    if (existingPcColumns.has(column)) continue;
    await connection.query(`ALTER TABLE pc_form_fields ADD COLUMN \`${column}\` JSON NULL`);
    await connection.query(`UPDATE pc_form_fields SET \`${column}\` = ? WHERE \`${column}\` IS NULL`, ['[]']);
    await connection.query(`ALTER TABLE pc_form_fields MODIFY COLUMN \`${column}\` JSON NOT NULL`);
  }

  const [ipConfigColumns] = await connection.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ip_form_fields'`,
    [dbName]
  );
  const existingIpConfigColumns = new Set(ipConfigColumns.map((row) => row.COLUMN_NAME));
  for (const column of pcJsonColumns) {
    if (existingIpConfigColumns.has(column)) continue;
    await connection.query(`ALTER TABLE ip_form_fields ADD COLUMN \`${column}\` JSON NULL`);
    await connection.query(`UPDATE ip_form_fields SET \`${column}\` = ? WHERE \`${column}\` IS NULL`, ['[]']);
    await connection.query(`ALTER TABLE ip_form_fields MODIFY COLUMN \`${column}\` JSON NOT NULL`);
  }

  const [ipAddressColumns] = await connection.query<any[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ip_addresses'`,
    [dbName]
  );
  if (!new Set(ipAddressColumns.map((row) => row.COLUMN_NAME)).has('extra_data')) {
    await connection.query('ALTER TABLE ip_addresses ADD COLUMN extra_data JSON NULL');
  }

  console.log(`Schema applied to database "${dbName}".`);
  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
