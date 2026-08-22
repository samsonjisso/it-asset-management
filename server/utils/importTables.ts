import type { Row, UserRole } from "../types.js";
import { WRITE_ROLES, MANAGE_ROLES } from "./auth.js";
import { syncIpForEntity } from "./ipSync.js";
import { assertSafeText } from "../middleware/common.js";
import { validateDepartmentBody } from "../middleware/departmentValidation.js";
import { validatePcRegistrationBody } from "../middleware/pcValidation.js";
import { validateLicenseBody } from "../middleware/licenseValidation.js";
import { validateDeviceBody } from "../middleware/deviceValidation.js";
import { validateServerBody } from "../middleware/serverValidation.js";
import { validateReminderBody } from "../middleware/reminderValidation.js";
import { validateIpAddressBody } from "../middleware/ipAddressValidation.js";
import { validateAssetBody } from "../middleware/assetValidation.js";

export interface ImportTableConfig {
  name: string;
  label: string;
  /** Roles allowed to run an import into this table. */
  insertRoles: UserRole[];
  /** Columns beyond the universal system columns (id/timestamps/audit) that the server fills in itself. */
  extraSystemColumns?: string[];
  autoAssetId?: boolean;
  /** Throws with a user-facing message when the mapped row violates a business rule. */
  validate?: (body: Row) => void;
  afterInsert?: (connection: any, id: string, body: Row) => Promise<void>;
}

/**
 * Fallback validator for tables that don't have a dedicated one (the
 * lookup/configuration tables): just guards against script injection in
 * any text field, mirroring what sanitizeBody/validateGenericRequest do
 * for the normal CRUD write path.
 */
function validateGenericLookupBody(body: Row): void {
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") assertSafeText(value, key);
  }
}

const CONFIG_TABLE_NAMES: Array<[string, string]> = [
  ["license_types", "License Types"],
  ["license_subtypes", "License Subtypes"],
  ["device_types", "Device Types"],
  ["device_owners", "Device Owners"],
  ["server_owners", "Server Owners"],
  ["server_types", "Server Types"],
  ["server_environments", "Server Environments"],
  ["ip_subnets", "IP Subnets"],
  ["asset_models", "Asset Models"],
  ["reminder_types", "Reminder Types"],
];

export const IMPORT_TABLES: ImportTableConfig[] = [
  {
    name: "departments",
    label: "Departments",
    insertRoles: ["admin", "manager"],
    validate: validateDepartmentBody,
  },
  {
    name: "pc_registrations",
    label: "PC Registrations",
    insertRoles: WRITE_ROLES,
    autoAssetId: true,
    validate: validatePcRegistrationBody,
    afterInsert: (connection, id, body) =>
      syncIpForEntity(connection, "pc_registrations", id, body),
  },
  {
    name: "licenses",
    label: "Licenses",
    insertRoles: WRITE_ROLES,
    autoAssetId: true,
    validate: validateLicenseBody,
  },
  {
    name: "devices",
    label: "Devices",
    insertRoles: WRITE_ROLES,
    autoAssetId: true,
    validate: validateDeviceBody,
    afterInsert: (connection, id, body) =>
      syncIpForEntity(connection, "devices", id, body),
  },
  {
    name: "servers",
    label: "Servers",
    insertRoles: WRITE_ROLES,
    autoAssetId: true,
    validate: validateServerBody,
    afterInsert: (connection, id, body) =>
      syncIpForEntity(connection, "servers", id, body),
  },
  {
    name: "reminders",
    label: "Reminders",
    insertRoles: WRITE_ROLES,
    validate: validateReminderBody,
  },
  {
    name: "ip_addresses",
    label: "IP Addresses",
    insertRoles: WRITE_ROLES,
    validate: validateIpAddressBody,
  },
  {
    name: "assets",
    label: "Assets",
    insertRoles: WRITE_ROLES,
    autoAssetId: true,
    validate: validateAssetBody,
  },
  ...CONFIG_TABLE_NAMES.map(
    ([name, label]): ImportTableConfig => ({
      name,
      label,
      insertRoles: MANAGE_ROLES,
      validate: validateGenericLookupBody,
    }),
  ),
];

export function getImportTable(name: string): ImportTableConfig | undefined {
  return IMPORT_TABLES.find((t) => t.name === name);
}
