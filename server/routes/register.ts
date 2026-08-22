import type { Express } from "express";
import { createCrudRouter } from "./crud.routes.js";
import { WRITE_ROLES, MANAGE_ROLES } from "../utils/auth.js";
import { syncIpForEntity, clearAndSyncIpForUpdate } from "../utils/ipSync.js";
import { validatePcRegistration } from "../middleware/pcValidation.js";
import { validateLicense } from "../middleware/licenseValidation.js";
import { validateDevice } from "../middleware/deviceValidation.js";
import { validateReminder } from "../middleware/reminderValidation.js";
import { validateIpAddress } from "../middleware/ipAddressValidation.js";
import { validateServer } from "../middleware/serverValidation.js";
import { validateDepartment } from "../middleware/departmentValidation.js";

/**
 * Registers every generic CRUD table route (and its validation
 * middleware) onto the app. Extracted verbatim from index.ts so app.ts
 * itself stays focused on general middleware + the auth/profiles/ip-check
 * routes; only the mounting order and options are unchanged.
 */
export function registerCrudRoutes(app: Express) {
  app.use("/api/departments", validateDepartment);
  app.use(
    "/api/departments",
    createCrudRouter("departments", {
      insertRoles: ["admin", "manager"],
      updateRoles: ["admin", "manager"],
      deleteRoles: ["admin"],
    }),
  );

  app.use("/api/pc_registrations", validatePcRegistration);
  app.use(
    "/api/pc_registrations",
    createCrudRouter("pc_registrations", {
      insertRoles: WRITE_ROLES,
      updateRoles: WRITE_ROLES,
      deleteRoles: MANAGE_ROLES,
      withDepartment: true,
      autoAssetId: true,
      afterInsert: (connection, id, body) =>
        syncIpForEntity(connection, "pc_registrations", id, body),
      afterUpdate: (connection, id, body) =>
        clearAndSyncIpForUpdate(connection, "pc_registrations", id, body),
    }),
  );

  app.use("/api/licenses", validateLicense);
  app.use(
    "/api/licenses",
    createCrudRouter("licenses", {
      insertRoles: WRITE_ROLES,
      updateRoles: WRITE_ROLES,
      deleteRoles: MANAGE_ROLES,
      autoAssetId: true,
    }),
  );

  app.use("/api/devices", validateDevice);
  app.use(
    "/api/devices",
    createCrudRouter("devices", {
      insertRoles: WRITE_ROLES,
      updateRoles: WRITE_ROLES,
      deleteRoles: MANAGE_ROLES,
      autoAssetId: true,
      afterInsert: (connection, id, body) =>
        syncIpForEntity(connection, "devices", id, body),
      afterUpdate: (connection, id, body) =>
        clearAndSyncIpForUpdate(connection, "devices", id, body),
    }),
  );

  app.use("/api/servers", validateServer);
  app.use(
    "/api/servers",
    createCrudRouter("servers", {
      insertRoles: WRITE_ROLES,
      updateRoles: WRITE_ROLES,
      deleteRoles: MANAGE_ROLES,
      autoAssetId: true,
      afterInsert: (connection, id, body) =>
        syncIpForEntity(connection, "servers", id, body),
      afterUpdate: (connection, id, body) =>
        clearAndSyncIpForUpdate(connection, "servers", id, body),
    }),
  );

  app.use("/api/reminders", validateReminder);
  app.use(
    "/api/reminders",
    createCrudRouter("reminders", {
      insertRoles: WRITE_ROLES,
      updateRoles: ["admin", "manager", "register_user", "assessor"],
      deleteRoles: MANAGE_ROLES,
    }),
  );

  app.use("/api/ip_addresses", validateIpAddress);
  app.use(
    "/api/ip_addresses",
    createCrudRouter("ip_addresses", {
      insertRoles: WRITE_ROLES,
      updateRoles: WRITE_ROLES,
      deleteRoles: MANAGE_ROLES,
      withDepartment: true,
      withIpRelations: true,
    }),
  );

  // Customization/configuration CRUD. These tables are intentionally kept generic
  // so administrators can manage the values used by registration forms without
  // requiring a schema change for every new option.
  const CONFIG_TABLES = [
    "license_types",
    "license_subtypes",
    "device_types",
    "device_owners",
    "server_owners",
    "server_types",
    "server_environments",
    "ip_subnets",
    "asset_models",
    "reminder_types",
  ] as const;
  const AUTO_CODE_TABLES = new Set([
    "server_owners",
    "server_environments",
    "server_types",
    "device_owners",
    "device_types",
    "license_types",
  ]);
  for (const table of CONFIG_TABLES) {
    app.use(
      `/api/${table}`,
      createCrudRouter(table, {
        insertRoles: ["admin", "manager"],
        updateRoles: ["admin", "manager"],
        deleteRoles: ["admin"],
        autoCode: AUTO_CODE_TABLES.has(table),
      }),
    );
  }
}
