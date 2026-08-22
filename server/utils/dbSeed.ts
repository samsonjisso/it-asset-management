import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Pool } from "mysql2/promise";

/**
 * Seeds the customization/configuration lookup tables (license types,
 * device types, etc.) with their defaults, but only if each table is
 * still empty. Extracted verbatim from db.ts.
 */
export async function seedConfigurationDefaults(
  db: Pool,
  nowIso: () => string,
) {
  const connection = await db.getConnection();
  try {
    const ts = nowIso();
    const seed = async (table: string, rows: Record<string, any>[]) => {
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS c FROM ${table}`,
      );
      if (Number((countRows as any[])[0]?.c || 0) > 0) return;
      for (const row of rows) {
        const id = crypto.randomUUID();
        const cols = ["id", ...Object.keys(row), "created_at", "updated_at"];
        const vals = [id, ...Object.values(row), ts, ts];
        await connection.execute(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
          vals,
        );
      }
    };
    await seed("license_types", [
      {
        code: "operating_system",
        label: "Operating System License",
        notes: null,
      },
      { code: "email_365", label: "Email / 365 License", notes: null },
      { code: "veam_backup", label: "Veeam Backup License", notes: null },
      { code: "vmware", label: "VMware / vCenter License", notes: null },
      { code: "other", label: "Other License", notes: null },
    ]);
    await seed("server_owners", [
      { code: "application", label: "Application" },
      { code: "information_security", label: "Information Security" },
      { code: "infrastructure_management", label: "Infrastructure Management" },
    ]);
    await seed("server_types", [
      { code: "redhat", label: "Red Hat" },
      { code: "ubuntu", label: "Ubuntu" },
      { code: "windows_server", label: "Windows Server" },
      { code: "other", label: "Other" },
    ]);
    await seed("server_environments", [
      { code: "production", label: "Production" },
      { code: "test", label: "Test" },
      { code: "standby", label: "Standby" },
    ]);
    await seed("device_owners", [
      { code: "infrastructure_management", label: "Infrastructure Management" },
      { code: "application_management", label: "Application Management" },
      { code: "information_security", label: "Information Security" },
    ]);
    await seed("device_types", [
      {
        code: "network",
        label: "Network Device",
        icon: "Network",
        base_fields:
          '["ip_address","serial_number","mac_address","location","rack_number"]',
        required_base_fields: "[]",
        core_fields: '["device_owner","device_model","hostname"]',
        required_core_fields: '["device_owner","hostname"]',
        field_labels: "{}",
        fields: "[]",
      },
      {
        code: "physical_server",
        label: "Physical Server",
        icon: "Server",
        base_fields:
          '["ip_address","serial_number","mac_address","location","rack_number"]',
        required_base_fields: "[]",
        core_fields: '["device_owner","device_model","hostname"]',
        required_core_fields: '["device_owner","hostname"]',
        field_labels: "{}",
        fields: "[]",
      },
      {
        code: "storage_server",
        label: "Storage Server",
        icon: "Boxes",
        base_fields:
          '["ip_address","serial_number","mac_address","location","rack_number"]',
        required_base_fields: "[]",
        core_fields: '["device_owner","device_model","hostname"]',
        required_core_fields: '["device_owner","hostname"]',
        field_labels: "{}",
        fields: "[]",
      },
      {
        code: "access_switch",
        label: "Access Switch",
        icon: "Network",
        base_fields:
          '["ip_address","serial_number","mac_address","location","rack_number"]',
        required_base_fields: "[]",
        core_fields: '["device_owner","device_model","hostname"]',
        required_core_fields: '["device_owner","hostname"]',
        field_labels: "{}",
        fields: "[]",
      },
    ]);
    await seed("reminder_types", [
      { label: "License Expiry" },
      { label: "Maintenance" },
      { label: "Warranty" },
      { label: "Other" },
    ]);
  } finally {
    connection.release();
  }
}

/**
 * Seeds a default administrator account on first run so the system is
 * usable immediately after cloning the repo. Extracted verbatim from db.ts.
 */
export async function seedDefaultAdmin(db: Pool, nowIso: () => string) {
  try {
    const adminEmail =
      process.env.SEED_ADMIN_EMAIL || "admin@gohbetochbank.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT id FROM profiles WHERE email = ?",
        [adminEmail],
      );

      if ((rows as any[]).length === 0) {
        const id = crypto.randomUUID();
        const hash = bcrypt.hashSync(adminPassword, 10);
        const ts = nowIso();

        await connection.execute(
          `INSERT INTO profiles (id, email, password_hash, full_name, role, phone, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'admin', NULL, 1, ?, ?)`,
          [id, adminEmail, hash, "System Administrator", ts, ts],
        );

        console.log(
          `Seeded default admin account -> email: ${adminEmail}  password: ${adminPassword}`,
        );
        console.log("IMPORTANT: change this password after your first login.");
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Failed to seed default admin:", error);
    throw error;
  }
}
