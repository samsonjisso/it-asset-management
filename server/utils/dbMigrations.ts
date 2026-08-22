/**
 * Adds columns/foreign keys/unique indexes that older databases (created
 * by the previous Next.js/MariaDB version) may be missing. Every helper
 * checks INFORMATION_SCHEMA first, so these are safe to run on every
 * startup and never drop existing data. Extracted verbatim from db.ts.
 */
export async function runColumnMigrations(connection: any) {
  const ensureColumn = async (
    table: string,
    column: string,
    definition: string,
  ) => {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    if (Number((rows as any[])[0]?.c || 0) === 0) {
      await connection.execute(
        `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
      );
    }
  };

  await ensureColumn(
    "profiles",
    "must_change_password",
    "TINYINT(1) NOT NULL DEFAULT 0",
  );
  await ensureColumn("pc_registrations", "asset_id", "VARCHAR(50)");
  await ensureColumn("pc_registrations", "cpu", "VARCHAR(255)");
  await ensureColumn("pc_registrations", "memory_detail", "VARCHAR(255)");
  await ensureColumn("pc_registrations", "generation_detail", "VARCHAR(255)");
  await ensureColumn("pc_registrations", "owner_name", "VARCHAR(255)");
  await ensureColumn("pc_registrations", "model_id", "VARCHAR(36)");
  await ensureColumn("pc_registrations", "image", "LONGTEXT");
  await ensureColumn("pc_registrations", "ip_address_id", "VARCHAR(36)");
  await ensureColumn("licenses", "asset_id", "VARCHAR(50)");
  await ensureColumn("devices", "asset_id", "VARCHAR(50)");
  await ensureColumn("devices", "extra_data", "LONGTEXT");
  await ensureColumn("devices", "model_id", "VARCHAR(36)");
  await ensureColumn("devices", "image", "LONGTEXT");
  await ensureColumn("devices", "ip_address_id", "VARCHAR(36)");
  await ensureColumn("servers", "asset_id", "VARCHAR(50)");
  await ensureColumn("servers", "network_subnet", "VARCHAR(255)");
  await ensureColumn("servers", "image", "LONGTEXT");
  await ensureColumn("servers", "ip_address_id", "VARCHAR(36)");
  await ensureColumn("assets", "asset_id", "VARCHAR(50)");
  await ensureColumn("ip_addresses", "access_switch_port", "VARCHAR(100)");
  await ensureColumn("ip_addresses", "patch_panel_label", "VARCHAR(100)");
  await ensureColumn("ip_addresses", "port", "INT");
  await ensureColumn("ip_addresses", "switch_port", "VARCHAR(50)");
  await ensureColumn("ip_addresses", "switch_ip", "VARCHAR(45)");
  await ensureColumn("ip_addresses", "patch_panel_port", "VARCHAR(50)");
  await ensureColumn("ip_addresses", "vlan", "VARCHAR(50)");
  await ensureColumn("ip_addresses", "assigned_entity_type", "VARCHAR(30)");
  await ensureColumn("ip_addresses", "assigned_entity_id", "VARCHAR(36)");

  const ensureIpForeignKey = async (table: string, constraint: string) => {
    const [rows] = await connection.execute(
      `SELECT k.CONSTRAINT_NAME, r.DELETE_RULE
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
       JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
       WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
         AND k.COLUMN_NAME = 'ip_address_id' AND k.REFERENCED_TABLE_NAME = 'ip_addresses'`,
      [table],
    );
    const existing = (rows as any[])[0];
    if (existing && existing.DELETE_RULE !== "SET NULL") {
      await connection.execute(
        `ALTER TABLE ${table} DROP FOREIGN KEY \`${existing.CONSTRAINT_NAME}\``,
      );
    }
    if (!existing || existing.DELETE_RULE !== "SET NULL") {
      await connection.execute(
        `ALTER TABLE ${table} ADD CONSTRAINT \`${constraint}\` FOREIGN KEY (ip_address_id) REFERENCES ip_addresses(id) ON DELETE SET NULL`,
      );
    }
  };

  await ensureIpForeignKey(
    "pc_registrations",
    "fk_pc_registrations_ip_address",
  );
  await ensureIpForeignKey("devices", "fk_devices_ip_address");
  await ensureIpForeignKey("servers", "fk_servers_ip_address");

  const ensureUniqueIndex = async (
    table: string,
    column: string,
    indexName: string,
  ) => {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
      [table, column],
    );
    if (Number((rows as any[])[0]?.c || 0) === 0) {
      await connection.execute(
        `ALTER TABLE ${table} ADD UNIQUE KEY \`${indexName}\` (\`${column}\`)`,
      );
    }
  };

  await ensureUniqueIndex(
    "ip_addresses",
    "hostname",
    "uq_ip_addresses_hostname",
  );
  await ensureUniqueIndex(
    "pc_registrations",
    "hostname",
    "uq_pc_registrations_hostname",
  );
  await ensureUniqueIndex("devices", "hostname", "uq_devices_hostname");
  await ensureUniqueIndex("servers", "hostname", "uq_servers_hostname");
}
