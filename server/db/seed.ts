/**
 * One-time data seed: default admin account + the starter Customization
 * lists (license types, device types, server owners, etc.) that used to
 * be hard-coded before they became admin-managed tables. Ported from
 * the seed*() functions in the original server/db.js.
 *
 * Idempotent: every seed function checks the row count first and does
 * nothing if the table already has data, so this is safe to run again
 * after an admin has since added/changed entries.
 *
 * Run with: npm run db:seed
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { pool } from "../lib/db";

async function ensureDatabase() {
  const dbName = process.env.DB_NAME || "gbb_inventory";
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    const escapedDbName = dbName.replaceAll("`", "``");
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Database ready: "${dbName}"`);
  } finally {
    await connection.end();
  }
}

async function count(table: string): Promise<number> {
  const [rows] = await pool.query<any[]>(`SELECT COUNT(*) as c FROM ${table}`);
  return rows[0].c as number;
}

async function seedLicenseTypes() {
  if ((await count("license_types")) > 0) return;
  const DEFAULT_LICENSE_TYPES = [
    {
      code: "operating_system",
      label: "Operating System License",
      subtypes: ["Windows", "Redhat", "Ubuntu", "Other"],
    },
    {
      code: "email_365",
      label: "Email / 365 License",
      subtypes: [
        "MS Business Standard",
        "Exchange Online",
        "MS Defender",
        "Other",
      ],
    },
    {
      code: "veam_backup",
      label: "VEAM Backup License",
      subtypes: ["VEAM Backup & Replication", "VEAM One", "Other"],
    },
    {
      code: "vmware",
      label: "VMware / vCenter License",
      subtypes: ["vSphere", "vCenter Server", "ESXi", "Other"],
    },
    { code: "other", label: "Other License", subtypes: ["Other"] },
  ];
  for (const t of DEFAULT_LICENSE_TYPES) {
    const typeId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO license_types (id, code, label) VALUES (?, ?, ?)",
      [typeId, t.code, t.label],
    );
    for (const sub of t.subtypes) {
      await pool.query(
        "INSERT INTO license_subtypes (id, license_type_id, label) VALUES (?, ?, ?)",
        [crypto.randomUUID(), typeId, sub],
      );
    }
  }
  console.log("Seeded license types");
}

async function seedDeviceTypes() {
  if ((await count("device_types")) > 0) return;
  const DEFAULT_DEVICE_TYPES = [
    {
      code: "network",
      label: "Network Device",
      icon: "Network",
      fields: [
        {
          key: "port_count",
          label: "Number of Ports",
          placeholder: "e.g., 24",
        },
      ],
    },
    {
      code: "physical_server",
      label: "Physical Server",
      icon: "Server",
      fields: [
        { key: "cpu", label: "CPU" },
        { key: "ram", label: "RAM" },
        { key: "storage", label: "Storage" },
        { key: "os", label: "Operating System" },
      ],
    },
    {
      code: "storage_server",
      label: "Storage Server",
      icon: "Boxes",
      fields: [
        {
          key: "capacity_tb",
          label: "Storage Capacity",
          placeholder: "e.g., 48TB",
        },
        { key: "raid_type", label: "RAID Type", placeholder: "e.g., RAID 6" },
      ],
    },
    {
      code: "wifi_access_point",
      label: "WiFi Access Point",
      icon: "Wifi",
      fields: [
        { key: "ssid", label: "SSID" },
        { key: "coverage_area", label: "Coverage Area" },
      ],
    },
    {
      code: "core_switch",
      label: "Core Switch",
      icon: "Network",
      fields: [
        {
          key: "port_count",
          label: "Number of Ports",
          placeholder: "e.g., 48",
        },
        {
          key: "uplink_speed",
          label: "Uplink Speed",
          placeholder: "e.g., 10Gbps",
        },
      ],
    },
    {
      code: "access_switch",
      label: "Access Switch",
      icon: "Network",
      fields: [
        {
          key: "port_count",
          label: "Number of Ports",
          placeholder: "e.g., 24",
        },
        {
          key: "uplink_speed",
          label: "Uplink Speed",
          placeholder: "e.g., 1Gbps",
        },
      ],
    },
    {
      code: "ethiotelecom_epon",
      label: "Ethiotelecom EPON",
      icon: "Wifi",
      base: ["ip_address", "serial_number", "location"],
      fields: [
        { key: "onu_serial", label: "ONU Serial Number" },
        { key: "circuit_id", label: "Provider Circuit ID" },
        {
          key: "port_speed",
          label: "Port Speed",
          placeholder: "e.g., 100Mbps",
        },
      ],
    },
    {
      code: "ethiotelecom_gpon",
      label: "Ethiotelecom GPON",
      icon: "Wifi",
      base: ["ip_address", "serial_number", "location"],
      fields: [
        { key: "onu_serial", label: "ONU Serial Number" },
        { key: "circuit_id", label: "Provider Circuit ID" },
        { key: "port_speed", label: "Port Speed", placeholder: "e.g., 1Gbps" },
      ],
    },
    {
      code: "edge_router",
      label: "Edge Router",
      icon: "Router",
      fields: [
        { key: "wan_provider", label: "WAN Provider" },
        { key: "throughput", label: "Throughput", placeholder: "e.g., 1Gbps" },
      ],
    },
    {
      code: "distribution_switch",
      label: "Distribution Switch",
      icon: "Network",
      fields: [
        {
          key: "port_count",
          label: "Number of Ports",
          placeholder: "e.g., 24",
        },
        {
          key: "uplink_speed",
          label: "Uplink Speed",
          placeholder: "e.g., 10Gbps",
        },
      ],
    },
    {
      code: "fire_extinguisher",
      label: "Fire Extinguisher",
      icon: "Shield",
      base: ["location"],
      fields: [
        {
          key: "extinguisher_type",
          label: "Extinguisher Type",
          placeholder: "e.g., CO2, Dry Powder",
        },
        { key: "capacity", label: "Capacity", placeholder: "e.g., 5kg" },
        {
          key: "last_inspection_date",
          label: "Last Inspection Date",
          type: "date",
        },
        { key: "expiry_date", label: "Expiry Date", type: "date" },
      ],
    },
    {
      code: "ac",
      label: "AC Unit",
      icon: "Wind",
      base: ["location"],
      fields: [
        {
          key: "capacity_btu",
          label: "Capacity",
          placeholder: "e.g., 18000 BTU",
        },
        {
          key: "refrigerant_type",
          label: "Refrigerant Type",
          placeholder: "e.g., R410A",
        },
      ],
    },
    {
      code: "ups",
      label: "UPS",
      icon: "Battery",
      base: ["location", "rack_number"],
      fields: [
        { key: "capacity_va", label: "Capacity", placeholder: "e.g., 3000VA" },
        { key: "battery_type", label: "Battery Type" },
        {
          key: "runtime_minutes",
          label: "Runtime",
          placeholder: "e.g., 30 minutes",
        },
      ],
    },
    {
      code: "monitoring_tv",
      label: "Monitoring TV",
      icon: "Tv",
      base: ["ip_address", "location"],
      fields: [
        {
          key: "screen_size",
          label: "Screen Size",
          placeholder: "e.g., 55 inch",
        },
        { key: "resolution", label: "Resolution", placeholder: "e.g., 4K" },
      ],
    },
    {
      code: "rack",
      label: "Rack",
      icon: "Server",
      base: ["location"],
      fields: [
        {
          key: "rack_units",
          label: "Rack Units (U)",
          placeholder: "e.g., 42U",
        },
        {
          key: "power_capacity",
          label: "Power Capacity",
          placeholder: "e.g., 5kW",
        },
      ],
    },
    {
      code: "cctv_camera",
      label: "CCTV Camera",
      icon: "Camera",
      base: ["ip_address", "mac_address", "location"],
      fields: [
        { key: "resolution", label: "Resolution", placeholder: "e.g., 1080p" },
        {
          key: "storage_days",
          label: "Storage Retention",
          placeholder: "e.g., 30 days",
        },
      ],
    },
    {
      code: "digital_signage",
      label: "Digital Signage",
      icon: "Monitor",
      base: ["ip_address", "location"],
      fields: [
        {
          key: "screen_size",
          label: "Screen Size",
          placeholder: "e.g., 43 inch",
        },
        { key: "content_source", label: "Content Source" },
      ],
    },
    {
      code: "printer_photocopy",
      label: "Printer / Photocopier",
      icon: "Printer",
      base: ["ip_address", "serial_number", "location"],
      fields: [
        { key: "toner_type", label: "Toner / Cartridge Type" },
        { key: "page_counter", label: "Page Counter" },
      ],
    },
    {
      code: "check_scanner",
      label: "Check Scanner",
      icon: "ScanLine",
      base: ["ip_address", "serial_number", "location"],
      fields: [
        {
          key: "resolution_dpi",
          label: "Resolution",
          placeholder: "e.g., 300 DPI",
        },
        {
          key: "connectivity",
          label: "Connectivity",
          placeholder: "e.g., USB",
        },
      ],
    },
    {
      code: "normal_scanner",
      label: "Normal Scanner",
      icon: "ScanLine",
      base: ["ip_address", "serial_number", "location"],
      fields: [
        {
          key: "resolution_dpi",
          label: "Resolution",
          placeholder: "e.g., 300 DPI",
        },
        {
          key: "connectivity",
          label: "Connectivity",
          placeholder: "e.g., USB",
        },
      ],
    },
  ];
  const DEFAULT_BASE = [
    "ip_address",
    "serial_number",
    "mac_address",
    "location",
    "rack_number",
  ];
  for (const t of DEFAULT_DEVICE_TYPES) {
    await pool.query(
      `INSERT INTO device_types (id, code, label, icon, base_fields, required_base_fields, core_fields, required_core_fields, field_labels, fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        t.code,
        t.label,
        t.icon,
        JSON.stringify((t as any).base || DEFAULT_BASE),
        JSON.stringify([]),
        JSON.stringify([
          "device_owner",
          "department_id",
          "device_model",
          "hostname",
        ]),
        JSON.stringify(["device_owner", "hostname"]),
        JSON.stringify({}),
        JSON.stringify(t.fields),
      ],
    );
  }
  console.log("Seeded device types");
}

async function seedSimpleLookup(
  table: string,
  rows: Array<{ code: string; label: string }>,
) {
  if ((await count(table)) > 0) return;
  for (const r of rows) {
    await pool.query(
      `INSERT INTO ${table} (id, code, label) VALUES (?, ?, ?)`,
      [crypto.randomUUID(), r.code, r.label],
    );
  }
  console.log(`Seeded ${table}`);
}

async function seedFloors() {
  if ((await count("floors")) > 0) return;
  const DEFAULT_FLOORS = [
    { code: "ground_floor", label: "Ground Floor" },
    { code: "1st_floor", label: "1st Floor" },
    { code: "2nd_floor", label: "2nd Floor" },
    { code: "3rd_floor", label: "3rd Floor" },
  ];
  for (let i = 0; i < DEFAULT_FLOORS.length; i++) {
    const f = DEFAULT_FLOORS[i]!;
    await pool.query(
      "INSERT INTO floors (id, code, label, position) VALUES (?, ?, ?, ?)",
      [crypto.randomUUID(), f.code, f.label, i],
    );
  }
  console.log("Seeded floors");
}

async function seedReminderTypes() {
  if ((await count("reminder_types")) > 0) return;
  const DEFAULT_REMINDER_TYPES = [
    "Preventive Maintenance",
    "License Renewal",
    "Warranty Expiry",
    "Contract Renewal",
    "System Update",
    "Security Audit",
    "Backup Verification",
    "Hardware Check",
    "Other",
  ];
  for (const label of DEFAULT_REMINDER_TYPES) {
    await pool.query("INSERT INTO reminder_types (id, label) VALUES (?, ?)", [
      crypto.randomUUID(),
      label,
    ]);
  }
  console.log("Seeded reminder types");
}

async function seedPcFormFields() {
  if ((await count("pc_form_fields")) > 0) return;
  const DEFAULT_PC_BASE_FIELDS = [
    "hostname",
    "monitor_serial",
    "asset_tag",
    "service_tag",
    "mac_address",
    "license_id",
    "cpu",
    "memory_detail",
    "generation_detail",
    "ip_address",
    "owner_name",
    "department_id",
    "floor_number",
    "switch_port_number",
    "access_switch_name",
    "access_switch_ip",
    "patch_level_number",
    "model_id",
  ];
  const DEFAULT_REQUIRED = [
    "hostname",
    "service_tag",
    "mac_address",
    "license_id",
    "cpu",
    "memory_detail",
    "generation_detail",
    "department_id",
    "access_switch_ip",
  ];
  await pool.query(
    "INSERT INTO pc_form_fields (id, base_fields, required_base_fields, field_labels, fields) VALUES (?, ?, ?, ?, ?)",
    [
      crypto.randomUUID(),
      JSON.stringify(DEFAULT_PC_BASE_FIELDS),
      JSON.stringify(DEFAULT_REQUIRED),
      JSON.stringify({}),
      JSON.stringify([]),
    ],
  );
  console.log("Seeded pc_form_fields");
}

async function seedIpFormFields() {
  if ((await count("ip_form_fields")) > 0) return;
  const baseFields = [
    "hostname",
    "department_id",
    "ip_owner",
    "mac_address",
    "access_switch_port",
    "patch_panel_label",
    "notes",
  ];
  const requiredFields = [
    "hostname",
    "department_id",
    "ip_owner",
    "mac_address",
    "access_switch_port",
    "patch_panel_label",
  ];
  await pool.query(
    "INSERT INTO ip_form_fields (id, base_fields, required_base_fields, field_labels, fields) VALUES (?, ?, ?, ?, ?)",
    [
      crypto.randomUUID(),
      JSON.stringify(baseFields),
      JSON.stringify(requiredFields),
      JSON.stringify({}),
      JSON.stringify([]),
    ],
  );
  console.log("Seeded ip_form_fields");
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@gohbetochbank.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const [rows] = await pool.query<any[]>(
    "SELECT id FROM profiles WHERE email = ?",
    [email],
  );
  if (rows.length > 0) {
    await pool.query(
      "UPDATE profiles SET must_change_password = 0 WHERE id = ?",
      [rows[0].id],
    );
    console.log(
      `Admin account already exists (${email}); left must_change_password cleared.`,
    );
    return;
  }
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO profiles (id, email, password_hash, full_name, role, is_active, must_change_password, is_owner)
     VALUES (?, ?, ?, 'System Administrator', 'admin', 1, 0, 1)`,
    [id, email, hash],
  );
  console.log(`Seeded default admin account -> email: ${email}`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`Temporary password: ${password}`);
  }
}

async function main() {
  await ensureDatabase();
  await seedLicenseTypes();
  await seedDeviceTypes();
  await seedSimpleLookup("server_owners", [
    { code: "application", label: "Application" },
    { code: "information_security", label: "Information Security" },
    { code: "infrastructure_management", label: "Infrastructure Management" },
  ]);
  await seedSimpleLookup("device_owners", [
    { code: "infrastructure_management", label: "Infrastructure Management" },
    { code: "application_management", label: "Application Management" },
    { code: "information_security", label: "Information Security" },
  ]);
  await seedSimpleLookup("server_types", [
    { code: "redhat", label: "Redhat" },
    { code: "ubuntu", label: "Ubuntu" },
    { code: "windows_server", label: "Windows Server" },
    { code: "other", label: "Other" },
  ]);
  await seedSimpleLookup("server_environments", [
    { code: "production", label: "Production" },
    { code: "test", label: "Test" },
    { code: "standby", label: "Standby" },
  ]);
  await seedSimpleLookup("os_releases", [
    { code: "rhel_8", label: "Red Hat Enterprise Linux 8" },
    { code: "rhel_9", label: "Red Hat Enterprise Linux 9" },
    { code: "windows_server_2019", label: "Windows Server 2019" },
    { code: "windows_server_2022", label: "Windows Server 2022" },
    { code: "ubuntu_server", label: "Ubuntu Server" },
  ]);
  await seedSimpleLookup("host_locations", [
    { code: "vmware_esxi", label: "VMware ESXi" },
    { code: "hyper_v", label: "Hyper-V" },
    { code: "physical_server", label: "Physical Server" },
    { code: "cloud", label: "Cloud" },
    { code: "other", label: "Other" },
  ]);
  await seedFloors();
  await seedReminderTypes();
  await seedPcFormFields();
  await seedIpFormFields();
  await seedAdmin();
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
