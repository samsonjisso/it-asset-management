import type { PoolConnection, Pool } from 'mysql2/promise';
import { ApiError } from '@/server/lib/http';
import { WRITE_ROLES, DELETE_ROLES, ASSET_DELETE_ROLES } from '@/server/lib/constants';
import type { CrudTableConfig, Row } from './crudEngine';

type Queryable = Pool | PoolConnection;

// ---------------------------------------------------------------------
// Shared helpers (ported from server/index.js)
// ---------------------------------------------------------------------

async function slugifyCode(conn: PoolConnection, table: string, label: string, fallback: string): Promise<string> {
  const base =
    String(label || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback;
  let code = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await conn.query<any[]>(`SELECT 1 FROM ${table} WHERE code = ?`, [code]);
    if (rows.length === 0) break;
    code = `${base}_${n++}`;
  }
  return code;
}

async function checkLabelDuplicate(
  conn: PoolConnection,
  table: string,
  column: string,
  body: Row,
  currentId: string | null,
  opts: { itemLabel?: string; scopeCol?: string; scopeVal?: any } = {}
): Promise<void> {
  if (!(column in body)) return;
  const value = body[column] == null ? '' : String(body[column]).trim();
  if (!value) return;
  const clauses = [`${column} IS NOT NULL`, `LOWER(TRIM(${column})) = LOWER(?)`, 'id != ?'];
  const params: any[] = [value, currentId || ''];
  if (opts.scopeCol) {
    if (opts.scopeVal == null) {
      clauses.push(`${opts.scopeCol} IS NULL`);
    } else {
      clauses.push(`${opts.scopeCol} = ?`);
      params.push(opts.scopeVal);
    }
  }
  const [rows] = await conn.query<any[]>(`SELECT id FROM ${table} WHERE ${clauses.join(' AND ')}`, params);
  if (rows.length > 0) {
    throw new ApiError(409, `${opts.itemLabel || 'An entry'} "${value}" already exists.`);
  }
}

function labelCodeHooks(table: string, fallbackCode: string, opts: { itemLabel?: string } = {}) {
  return {
    beforeInsert: async (body: Row, { conn }: { conn: PoolConnection }) => {
      if (!body.label || !String(body.label).trim()) throw new ApiError(400, 'Label is required');
      body.label = String(body.label).trim();
      await checkLabelDuplicate(conn, table, 'label', body, null, opts);
      body.code =
        body.code && String(body.code).trim()
          ? String(body.code).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
          : await slugifyCode(conn, table, body.label, fallbackCode);
    },
    beforeUpdate: async (body: Row, { conn }: { conn: PoolConnection }, id: string) => {
      if ('label' in body) {
        const label = String(body.label || '').trim();
        if (!label) throw new ApiError(400, 'Label is required');
        body.label = label;
        await checkLabelDuplicate(conn, table, 'label', body, id, opts);
      }
    },
  };
}

async function countUsage(conn: Queryable, sql: string, params: any[]): Promise<number> {
  const [rows] = await (conn as any).query(sql, params);
  return rows[0].c as number;
}

function inUseError(count: number, message: string) {
  return count > 0 ? { status: 400, message } : null;
}

// ---------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------

export const departmentsConfig: CrudTableConfig = {
  table: 'departments',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  beforeInsert: async (body, { conn }) => {
    if ('name' in body) {
      const name = String(body.name || '').trim();
      if (!name) throw new ApiError(400, 'Name is required');
      body.name = name;
      await checkLabelDuplicate(conn, 'departments', 'name', body, null, { itemLabel: 'A department named' });
    }
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('name' in body) {
      const name = String(body.name || '').trim();
      if (!name) throw new ApiError(400, 'Name is required');
      body.name = name;
      await checkLabelDuplicate(conn, 'departments', 'name', body, id, { itemLabel: 'A department named' });
    }
  },
};

// ---------------------------------------------------------------------
// License Types / Subtypes
// ---------------------------------------------------------------------

export const licenseTypesConfig: CrudTableConfig = {
  table: 'license_types',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('license_types', 'license_type', { itemLabel: 'A license type named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM licenses WHERE license_type = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} license record(s) still use this type.`);
  },
};

export const licenseSubtypesConfig: CrudTableConfig = {
  table: 'license_subtypes',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  beforeInsert: async (body, { conn }) => {
    if (!body.label || !String(body.label).trim()) throw new ApiError(400, 'Label is required');
    if (!body.license_type_id) throw new ApiError(400, 'License type is required');
    body.label = String(body.label).trim();
    await checkLabelDuplicate(conn, 'license_subtypes', 'label', body, null, {
      itemLabel: 'A subtype named',
      scopeCol: 'license_type_id',
      scopeVal: body.license_type_id,
    });
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('label' in body) {
      const label = String(body.label || '').trim();
      if (!label) throw new ApiError(400, 'Label is required');
      body.label = label;
    }
    if ('label' in body || 'license_type_id' in body) {
      const [rows] = await conn.query<any[]>('SELECT label, license_type_id FROM license_subtypes WHERE id = ?', [id]);
      const current = rows[0];
      const label = 'label' in body ? body.label : current?.label;
      const scopeVal = 'license_type_id' in body ? body.license_type_id : current?.license_type_id;
      await checkLabelDuplicate(conn, 'license_subtypes', 'label', { label }, id, {
        itemLabel: 'A subtype named',
        scopeCol: 'license_type_id',
        scopeVal,
      });
    }
  },
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM licenses WHERE license_subtype = ?', [row.label]);
    return inUseError(c, `Cannot delete: ${c} license record(s) still use this subtype.`);
  },
};

// ---------------------------------------------------------------------
// Device Types
// ---------------------------------------------------------------------

export const deviceTypesConfig: CrudTableConfig = {
  table: 'device_types',
  insertRoles: DELETE_ROLES,
  updateRoles: DELETE_ROLES,
  deleteRoles: DELETE_ROLES,
  immutableCols: ['code'],
  ...labelCodeHooks('device_types', 'device_type', { itemLabel: 'A device type named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM devices WHERE device_type = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} device(s) still use this type.`);
  },
};

export const pcFormFieldsConfig: CrudTableConfig = {
  table: 'pc_form_fields',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
};

// ---------------------------------------------------------------------
// Owners / Vendors / Server config lookups
// ---------------------------------------------------------------------

export const deviceOwnersConfig: CrudTableConfig = {
  table: 'device_owners',
  moduleKey: 'device_owners',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('device_owners', 'device_owner', { itemLabel: 'A device owner named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM devices WHERE device_owner = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} device(s) still use this owner.`);
  },
};

export const serverOwnersConfig: CrudTableConfig = {
  table: 'server_owners',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('server_owners', 'server_owner', { itemLabel: 'A server owner named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE server_owner = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} server record(s) still use this owner.`);
  },
};

export const vendorsConfig: CrudTableConfig = {
  table: 'vendors',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: DELETE_ROLES,
  immutableCols: ['code'],
  ...labelCodeHooks('vendors', 'vendor', { itemLabel: 'A vendor named' }),
  beforeDelete: async (row, { conn }) => {
    const a = await countUsage(conn, 'SELECT COUNT(*) as c FROM licenses WHERE vendor = ?', [row.label]);
    const b = await countUsage(conn, 'SELECT COUNT(*) as c FROM asset_models WHERE manufacturer = ?', [row.label]);
    const c3 = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE vendor = ?', [row.label]);
    const c = a + b + c3;
    return inUseError(c, `Cannot delete: ${c} record(s) still use this vendor.`);
  },
};

export const serverTypesConfig: CrudTableConfig = {
  table: 'server_types',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('server_types', 'server_type', { itemLabel: 'A server type named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE server_type = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} server record(s) still use this type.`);
  },
};

export const serverEnvironmentsConfig: CrudTableConfig = {
  table: 'server_environments',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('server_environments', 'environment', { itemLabel: 'A server environment named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE environment = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} server record(s) still use this environment.`);
  },
};

export const osReleasesConfig: CrudTableConfig = {
  table: 'os_releases',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('os_releases', 'os_release', { itemLabel: 'An OS release named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE os_release = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} server record(s) still use this OS release.`);
  },
};

export const hostLocationsConfig: CrudTableConfig = {
  table: 'host_locations',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('host_locations', 'host_location', { itemLabel: 'A host location named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM servers WHERE host_location = ?', [row.code]);
    return inUseError(c, `Cannot delete: ${c} server record(s) still use this host location.`);
  },
};

export const floorsConfig: CrudTableConfig = {
  table: 'floors',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  beforeInsert: async (body, { conn }) => {
    if (!body.label || !String(body.label).trim()) throw new ApiError(400, 'Label is required');
    body.label = String(body.label).trim();
    await checkLabelDuplicate(conn, 'floors', 'label', body, null, { itemLabel: 'A floor named' });
    body.code =
      body.code && String(body.code).trim()
        ? String(body.code).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        : await slugifyCode(conn, 'floors', body.label, 'floor');
    if (body.position === undefined || body.position === null || body.position === '') {
      const [rows] = await conn.query<any[]>('SELECT MAX(position) as m FROM floors');
      body.position = rows[0].m == null ? 0 : rows[0].m + 1;
    }
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('label' in body) {
      const label = String(body.label || '').trim();
      if (!label) throw new ApiError(400, 'Label is required');
      body.label = label;
      await checkLabelDuplicate(conn, 'floors', 'label', body, id, { itemLabel: 'A floor named' });
    }
  },
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM pc_registrations WHERE floor_number = ?', [row.label]);
    return inUseError(c, `Cannot delete: ${c} PC record(s) still use this floor.`);
  },
};

export const accessSwitchesConfig: CrudTableConfig = {
  table: 'access_switches',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('access_switches', 'access_switch', { itemLabel: 'An access switch named' }),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM pc_registrations WHERE access_switch_name = ?', [row.label]);
    return inUseError(c, `Cannot delete: ${c} PC record(s) still use this access switch.`);
  },
};

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

async function validateAccessSwitchIp(body: Row, conn: PoolConnection, currentId: string | null): Promise<void> {
  if (!('label' in body)) return;
  const label = String(body.label || '').trim();
  if (!label) throw new ApiError(400, 'IP Address is required');
  if (!IPV4_RE.test(label)) throw new ApiError(400, 'Enter a valid IPv4 address (e.g. 10.6.1.103)');
  const [rows] = await conn.query<any[]>('SELECT id FROM access_switch_ips WHERE TRIM(label) = TRIM(?) AND id != ?', [
    label,
    currentId || '',
  ]);
  if (rows.length > 0) throw new ApiError(409, `IP Address ${label} is already registered as an access switch IP.`);
  body.label = label;
  body.code = label.replace(/[^0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export const accessSwitchIpsConfig: CrudTableConfig = {
  table: 'access_switch_ips',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  beforeInsert: (body, { conn }) => validateAccessSwitchIp(body, conn, null),
  beforeUpdate: (body, { conn }, id) => validateAccessSwitchIp(body, conn, id),
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM pc_registrations WHERE access_switch_ip = ?', [row.label]);
    return inUseError(c, `Cannot delete: ${c} PC record(s) still use this IP address.`);
  },
};

export const patchLevelsConfig: CrudTableConfig = {
  table: 'patch_levels',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  immutableCols: ['code'],
  ...labelCodeHooks('patch_levels', 'patch_level', { itemLabel: 'A patch/level value named' }),
  beforeDelete: async (row, { conn }) => {
    const usedByPc = await countUsage(conn, 'SELECT COUNT(*) as c FROM pc_registrations WHERE patch_level_number = ?', [row.label]);
    const usedByIp = await countUsage(conn, 'SELECT COUNT(*) as c FROM ip_addresses WHERE patch_panel_label = ?', [row.label]);
    const inUse = usedByPc + usedByIp;
    if (inUse === 0) return null;
    const parts: string[] = [];
    if (usedByPc > 0) parts.push(`${usedByPc} PC record(s)`);
    if (usedByIp > 0) parts.push(`${usedByIp} IP Address record(s)`);
    return { status: 400, message: `Cannot delete: ${parts.join(' and ')} still use this value.` };
  },
};

export const ipSubnetsConfig: CrudTableConfig = {
  table: 'ip_subnets',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  beforeInsert: async (body, { conn }) => {
    if (!body.prefix || !String(body.prefix).trim()) throw new ApiError(400, 'IP prefix is required');
    if (!body.label || !String(body.label).trim()) throw new ApiError(400, 'Label is required');
    body.prefix = String(body.prefix).trim();
    body.label = String(body.label).trim();
    await checkLabelDuplicate(conn, 'ip_subnets', 'prefix', body, null, { itemLabel: 'A subnet with prefix' });
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('prefix' in body) {
      const prefix = String(body.prefix || '').trim();
      if (!prefix) throw new ApiError(400, 'IP prefix is required');
      body.prefix = prefix;
      await checkLabelDuplicate(conn, 'ip_subnets', 'prefix', body, id, { itemLabel: 'A subnet with prefix' });
    }
    if ('label' in body) {
      const label = String(body.label || '').trim();
      if (!label) throw new ApiError(400, 'Label is required');
      body.label = label;
    }
  },
};

export const assetModelsConfig: CrudTableConfig = {
  table: 'asset_models',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  beforeInsert: async (body, { conn }) => {
    if (!body.name || !String(body.name).trim()) throw new ApiError(400, 'Model name is required');
    if (!['pc', 'device'].includes(body.target)) throw new ApiError(400, 'Target must be "pc" or "device"');
    body.name = String(body.name).trim();
    await checkLabelDuplicate(conn, 'asset_models', 'name', body, null, { itemLabel: 'A model named', scopeCol: 'target', scopeVal: body.target });
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('name' in body) {
      const name = String(body.name || '').trim();
      if (!name) throw new ApiError(400, 'Model name is required');
      body.name = name;
    }
    if ('target' in body && !['pc', 'device'].includes(body.target)) throw new ApiError(400, 'Target must be "pc" or "device"');
    if ('name' in body || 'target' in body) {
      const [rows] = await conn.query<any[]>('SELECT name, target FROM asset_models WHERE id = ?', [id]);
      const current = rows[0];
      const name = 'name' in body ? body.name : current?.name;
      const target = 'target' in body ? body.target : current?.target;
      await checkLabelDuplicate(conn, 'asset_models', 'name', { name }, id, { itemLabel: 'A model named', scopeCol: 'target', scopeVal: target });
    }
  },
  beforeDelete: async (row, { conn }) => {
    const table = row.target === 'pc' ? 'pc_registrations' : 'devices';
    const c = await countUsage(conn, `SELECT COUNT(*) as c FROM ${table} WHERE model_id = ?`, [row.id]);
    return inUseError(c, `Cannot delete: ${c} record(s) still use this model.`);
  },
};

export const reminderTypesConfig: CrudTableConfig = {
  table: 'reminder_types',
  insertRoles: ['admin'],
  updateRoles: ['admin'],
  deleteRoles: ['admin'],
  beforeInsert: async (body, { conn }) => {
    if (!body.label || !String(body.label).trim()) throw new ApiError(400, 'Label is required');
    body.label = String(body.label).trim();
    await checkLabelDuplicate(conn, 'reminder_types', 'label', body, null, { itemLabel: 'A reminder type named' });
  },
  beforeUpdate: async (body, { conn }, id) => {
    if ('label' in body) {
      const label = String(body.label || '').trim();
      if (!label) throw new ApiError(400, 'Label is required');
      body.label = label;
      await checkLabelDuplicate(conn, 'reminder_types', 'label', body, id, { itemLabel: 'A reminder type named' });
    }
  },
  beforeDelete: async (row, { conn }) => {
    const c = await countUsage(conn, 'SELECT COUNT(*) as c FROM reminders WHERE reminder_type = ?', [row.label]);
    return inUseError(c, `Cannot delete: ${c} reminder(s) still use this type.`);
  },
};

// ---------------------------------------------------------------------
// PC <-> License / IP linking helpers
// ---------------------------------------------------------------------

async function attachLicenseToPc(row: Row, conn: Queryable): Promise<Row> {
  if (!row) return row;
  if (row.license_id) {
    const [rows] = await (conn as any).query('SELECT * FROM licenses WHERE id = ?', [row.license_id]);
    const lic = rows[0];
    row.license = lic ? { ...lic, alert_sent: !!lic.alert_sent } : null;
  } else {
    row.license = null;
  }
  return row;
}

async function attachAssignedPc(row: Row, conn: Queryable): Promise<Row> {
  if (!row) return row;
  const [rows] = await (conn as any).query(
    'SELECT id, hostname, asset_id FROM pc_registrations WHERE license_id = ?',
    [row.id]
  );
  row.assigned_pc = rows[0] || null;
  return row;
}

async function validatePcLicense(body: Row, conn: PoolConnection, currentPcId: string | null): Promise<void> {
  const touchesLicenseId = 'license_id' in body;
  const touchesProductKey = 'product_key' in body;
  if (!touchesLicenseId && !touchesProductKey) return;

  let licenseId: string | null;
  if (touchesLicenseId) {
    licenseId = body.license_id ? String(body.license_id).trim() : null;
    body.license_id = licenseId || null;
  } else {
    const [rows] = currentPcId
      ? await conn.query<any[]>('SELECT license_id FROM pc_registrations WHERE id = ?', [currentPcId])
      : [[]];
    licenseId = rows[0]?.license_id || null;
  }

  if (!licenseId) {
    if (!touchesProductKey) return;
    const manual = body.product_key ? String(body.product_key).trim() : '';
    body.product_key = manual || null;
    if (manual) {
      const [matches] = await conn.query<any[]>(
        `SELECT id, license_name, asset_id FROM licenses
         WHERE license_key IS NOT NULL AND TRIM(license_key) != ''
           AND LOWER(TRIM(license_key)) = LOWER(?)`,
        [manual]
      );
      const matchingLicense = matches[0];
      if (matchingLicense) {
        throw new ApiError(
          400,
          `"${manual}" matches an existing registered license (${matchingLicense.license_name || matchingLicense.asset_id}) - please select it from the list instead of entering it manually.`
        );
      }
      const [conflicts] = await conn.query<any[]>(
        `SELECT id, hostname FROM pc_registrations
         WHERE license_id IS NULL AND product_key IS NOT NULL AND TRIM(product_key) != ''
           AND LOWER(TRIM(product_key)) = LOWER(?) AND id != ?`,
        [manual, currentPcId || '']
      );
      const conflictPc = conflicts[0];
      if (conflictPc) {
        throw new ApiError(
          400,
          `This product key is already entered on PC "${conflictPc.hostname}". Register it once under License Registration and assign it to both, or use a different key.`
        );
      }
    }
    return;
  }
  const [licRows] = await conn.query<any[]>('SELECT * FROM licenses WHERE id = ?', [licenseId]);
  const license = licRows[0];
  if (!license) throw new ApiError(400, 'Selected license was not found - it may have been deleted. Please choose another.');
  const [conflictRows] = await conn.query<any[]>(
    'SELECT id, hostname FROM pc_registrations WHERE license_id = ? AND id != ?',
    [licenseId, currentPcId || '']
  );
  const conflict = conflictRows[0];
  if (conflict) {
    throw new ApiError(400, `This license is already assigned to PC "${conflict.hostname}". Unassign it there first, or choose a different license.`);
  }
  body.product_key = license.license_key || null;
}

interface DuplicateMatch {
  field: string;
  label: string;
  existing: Row;
  labelCol?: string;
}

async function findDuplicateAsset(
  conn: PoolConnection,
  table: string,
  identifierFields: [string, string][],
  body: Row,
  excludeId: string | null,
  labelCol?: string
): Promise<DuplicateMatch | null> {
  for (const [field, label] of identifierFields) {
    if (!(field in body)) continue;
    const value = body[field] == null ? '' : String(body[field]).trim();
    if (!value) continue;
    const selectCols = ['id', 'asset_id', ...(labelCol ? [labelCol] : [])];
    const [rows] = await conn.query<any[]>(
      `SELECT ${selectCols.join(', ')} FROM ${table}
       WHERE ${field} IS NOT NULL AND TRIM(${field}) != ''
         AND LOWER(TRIM(${field})) = LOWER(?)
         AND id != ?`,
      [value, excludeId || '']
    );
    if (rows[0]) return { field, label, existing: rows[0], labelCol };
  }
  return null;
}

function duplicateAssetError(match: DuplicateMatch, itemLabel = 'device'): ApiError {
  const { label, existing, labelCol } = match;
  const idPart = existing.asset_id ? `Asset ID: ${existing.asset_id}` : `record ID: ${existing.id}`;
  const labelValue = labelCol ? existing[labelCol] : null;
  const labelName = labelCol === 'hostname' ? 'Hostname' : labelCol === 'vendor' ? 'Vendor' : labelCol;
  const namePart = labelValue ? `, ${labelName}: ${labelValue}` : '';
  return new ApiError(409, `This ${itemLabel} is already registered in the system (matched by ${label} - ${idPart}${namePart}).`);
}

const PC_DUPLICATE_FIELDS: [string, string][] = [
  ['mac_address', 'MAC Address'],
  ['service_tag', 'Service Tag / Serial Number'],
  ['asset_tag', 'Asset Tag'],
  ['hostname', 'Hostname'],
];
const PC_REQUIRED_IDENTIFIER_FIELDS: [string, string][] = [
  ['mac_address', 'MAC Address'],
  ['service_tag', 'Service Tag / Serial Number'],
  ['asset_tag', 'Asset Tag'],
];
const DEVICE_DUPLICATE_FIELDS: [string, string][] = [
  ['mac_address', 'MAC Address'],
  ['serial_number', 'Service Tag / Serial Number'],
  ['hostname', 'Hostname'],
];
const SERVER_DUPLICATE_FIELDS: [string, string][] = [
  ['hostname', 'Server Name / Hostname'],
  ['ip_address', 'Server IP Address'],
];
const LICENSE_DUPLICATE_FIELDS: [string, string][] = [['license_key', 'License Key / Product Key']];

async function checkPcDuplicate(body: Row, conn: PoolConnection, currentId: string | null) {
  const match = await findDuplicateAsset(conn, 'pc_registrations', PC_DUPLICATE_FIELDS, body, currentId, 'hostname');
  if (match) throw duplicateAssetError(match, 'PC');
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function validatePcRequiredFields(body: Row, conn: PoolConnection, isInsert: boolean): Promise<void> {
  if (isInsert && !String(body.hostname ?? '').trim()) throw new ApiError(400, 'PC Hostname is required');

  const identifierProvided = PC_REQUIRED_IDENTIFIER_FIELDS.some(([field]) => {
    const value = String(body[field] ?? '').trim();
    return !!value && (field !== 'asset_tag' || value.toLowerCase() !== 'n/a');
  });
  if (isInsert && !identifierProvided) {
    throw new ApiError(400, 'At least one of MAC Address, Service Tag / Serial Number, or Asset Tag is required');
  }

  const [configRows] = await conn.query<any[]>('SELECT required_base_fields, fields FROM pc_form_fields ORDER BY created_at LIMIT 1');
  const config = configRows[0];
  const requiredBaseFields = parseJsonArray(config?.required_base_fields).filter((field): field is string => typeof field === 'string');
  for (const field of requiredBaseFields) {
    if (field === 'asset_tag') continue;
    if (!isInsert && !(field in body)) continue;
    if (field === 'license_id' && !String(body.license_id ?? '').trim() && !String(body.product_key ?? '').trim()) {
      throw new ApiError(400, 'Product Key / License is required');
    }
    if (field !== 'license_id' && !String(body[field] ?? '').trim()) throw new ApiError(400, `${field} is required`);
  }

  const requiredExtraFields = parseJsonArray(config?.fields).filter(
    (field): field is { key: string; label?: string; required?: boolean } =>
      !!field && typeof field === 'object' && typeof (field as any).key === 'string' && (field as any).required === true
  );
  if (!isInsert && !('extra_data' in body)) return;
  const extraData = body.extra_data && typeof body.extra_data === 'object' ? body.extra_data as Record<string, unknown> : {};
  for (const field of requiredExtraFields) {
    if (!String(extraData[field.key] ?? '').trim()) throw new ApiError(400, `${field.label || field.key} is required`);
  }
}
async function checkDeviceDuplicate(body: Row, conn: PoolConnection, currentId: string | null) {
  const match = await findDuplicateAsset(conn, 'devices', DEVICE_DUPLICATE_FIELDS, body, currentId, 'hostname');
  if (match) throw duplicateAssetError(match, 'device');
}
async function checkServerDuplicate(body: Row, conn: PoolConnection, currentId: string | null) {
  const match = await findDuplicateAsset(conn, 'servers', SERVER_DUPLICATE_FIELDS, body, currentId, 'hostname');
  if (match) throw duplicateAssetError(match, 'server');
}
async function checkLicenseDuplicate(body: Row, conn: PoolConnection, currentId: string | null) {
  const match = await findDuplicateAsset(conn, 'licenses', LICENSE_DUPLICATE_FIELDS, body, currentId, 'vendor');
  if (match) throw duplicateAssetError(match, 'license');
}

// ---------------------------------------------------------------------
// IP linking (pc_registrations / devices <-> ip_addresses)
// ---------------------------------------------------------------------

async function checkAndLinkIp(table: 'pc_registrations' | 'devices', body: Row, conn: PoolConnection, currentId: string | null): Promise<void> {
  if (!('ip_address' in body)) return;
  const raw = body.ip_address == null ? '' : String(body.ip_address).trim();
  body.ip_address = raw || null;
  if (!raw) {
    body.ip_id = null;
    return;
  }
  if (!IPV4_RE.test(raw)) throw new ApiError(400, 'IP Address must be a valid IPv4 address (e.g., 10.6.13.45)');

  const [ipRows] = await conn.query<any[]>('SELECT * FROM ip_addresses WHERE ip_address = ?', [raw]);
  const ipRecord = ipRows[0];

  if (ipRecord) {
    const otherTable = table === 'pc_registrations' ? 'devices' : 'pc_registrations';
    const [sameRows] = await conn.query<any[]>(`SELECT id, hostname FROM ${table} WHERE ip_id = ? AND id != ?`, [ipRecord.id, currentId || '']);
    const [otherRows] = await conn.query<any[]>(`SELECT id, hostname FROM ${otherTable} WHERE ip_id = ?`, [ipRecord.id]);
    const conflict = sameRows[0] || otherRows[0];
    if (conflict) {
      throw new ApiError(
        409,
        `IP Address ${raw} is already registered in IP Management and assigned to "${conflict.hostname || ipRecord.hostname || 'another asset'}". Unassign it there first, or choose a different address.`
      );
    }
    body.ip_id = ipRecord.id;
    body.ip_address = ipRecord.ip_address;
    return;
  }

  const [freeTextRows] = await conn.query<any[]>(
    `SELECT id, hostname FROM pc_registrations
     WHERE ip_address IS NOT NULL AND TRIM(ip_address) = TRIM(?) AND NOT (id = ? AND ? = 'pc_registrations')
     UNION ALL
     SELECT id, hostname FROM devices
     WHERE ip_address IS NOT NULL AND TRIM(ip_address) = TRIM(?) AND NOT (id = ? AND ? = 'devices')`,
    [raw, currentId || '', table, raw, currentId || '', table]
  );
  if (freeTextRows[0]) {
    throw new ApiError(
      409,
      `IP Address ${raw} is already registered to "${freeTextRows[0].hostname || 'another asset'}". Choose a different address, or register it in IP Management first to link it properly.`
    );
  }
  body.ip_id = null;
}

async function attachIpRecord(row: Row, conn: Queryable): Promise<Row> {
  if (!row) return row;
  if (row.ip_id) {
    const [rows] = await (conn as any).query('SELECT * FROM ip_addresses WHERE id = ?', [row.ip_id]);
    row.ip_record = rows[0] || null;
  } else {
    row.ip_record = null;
  }
  return row;
}

// ---------------------------------------------------------------------
// Licenses
// ---------------------------------------------------------------------

function validateLicense(body: Row, isInsert: boolean): void {
  if (isInsert || 'license_name' in body) {
    const name = String(body.license_name ?? '').trim();
    if (!name) throw new ApiError(400, 'License Name is required');
    body.license_name = name;
  }
  if (isInsert || 'license_subtype' in body) {
    const subtype = String(body.license_subtype ?? '').trim();
    if (!subtype) throw new ApiError(400, 'License Subtype is required');
    body.license_subtype = subtype;
  }
  const subtypeKnown = isInsert || 'license_subtype' in body;
  const isWindowsLicense = subtypeKnown && String(body.license_subtype ?? '').trim().toLowerCase() === 'windows';
  if (isInsert || 'number_of_licenses' in body) {
    const raw = body.number_of_licenses;
    const value = raw === null || raw === undefined ? '' : String(raw).trim();
    if (!value) {
      if (!isWindowsLicense) throw new ApiError(400, 'Number of Licenses is required');
      body.number_of_licenses = null;
    } else if (!/^\d+$/.test(value)) {
      throw new ApiError(400, 'Number of Licenses must be a whole number');
    } else {
      body.number_of_licenses = parseInt(value, 10);
    }
  }
  const neverExpires = isWindowsLicense ? true : Boolean(body.never_expires);
  const hadNeverExpiresFlag = 'never_expires' in body;
  delete body.never_expires;
  if (isWindowsLicense) {
    body.effective_date = null;
    body.expiry_date = null;
  } else if (isInsert || 'expiry_date' in body || hadNeverExpiresFlag) {
    if (neverExpires) {
      body.expiry_date = null;
    } else {
      const expiry = body.expiry_date ? String(body.expiry_date).trim() : '';
      if (!expiry) throw new ApiError(400, 'Expiry Date is required unless Never Expire is selected');
      body.expiry_date = expiry;
      if (body.effective_date && expiry < String(body.effective_date).trim()) {
        throw new ApiError(400, 'Expiry Date cannot be before the Effective Date');
      }
    }
  }
  if (isInsert || 'attachment' in body) {
    const attachment = body.attachment ? String(body.attachment) : '';
    if (!attachment) {
      body.attachment = null;
      body.attachment_name = null;
    } else {
      const match = /^data:([\w./+-]+);base64,(.+)$/s.exec(attachment);
      const allowedMime = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!match || !allowedMime.includes(match[1])) throw new ApiError(400, 'Attachment must be an image, PDF, or Word document');
      const approxBytes = (match[2].length * 3) / 4;
      if (approxBytes > 5 * 1024 * 1024) throw new ApiError(400, 'Attachment is too large (max 5MB)');
      if (!body.attachment_name || !String(body.attachment_name).trim()) throw new ApiError(400, 'Attachment filename is missing');
      body.attachment_name = String(body.attachment_name).trim();
    }
  }
}

export const licensesConfig: CrudTableConfig = {
  table: 'licenses',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
  autoAssetId: true,
  decorate: attachAssignedPc,
  beforeInsert: async (body, { conn }) => {
    validateLicense(body, true);
    await checkLicenseDuplicate(body, conn, null);
  },
  beforeUpdate: async (body, { conn }, id) => {
    validateLicense(body, false);
    await checkLicenseDuplicate(body, conn, id);
  },
  beforeDelete: async (row, { conn }) => {
    const [rows] = await conn.query<any[]>('SELECT hostname FROM pc_registrations WHERE license_id = ?', [row.id]);
    if (rows[0]) return { status: 400, message: `Cannot delete: this license is assigned to PC "${rows[0].hostname}". Unassign it there first.` };
    return null;
  },
  notify: { type: 'License', label: (row) => row.license_name || row.license_key || row.asset_id || row.id },
};

// ---------------------------------------------------------------------
// PC Registrations
// ---------------------------------------------------------------------

export const pcRegistrationsConfig: CrudTableConfig = {
  table: 'pc_registrations',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
  withDepartment: true,
  autoAssetId: true,
  beforeInsert: async (body, { conn }) => {
    await validatePcRequiredFields(body, conn, true);
    await checkPcDuplicate(body, conn, null);
    await validatePcLicense(body, conn, null);
    await checkAndLinkIp('pc_registrations', body, conn, null);
  },
  beforeUpdate: async (body, { conn }, id) => {
    await validatePcRequiredFields(body, conn, false);
    await checkPcDuplicate(body, conn, id);
    await validatePcLicense(body, conn, id);
    await checkAndLinkIp('pc_registrations', body, conn, id);
  },
  decorate: async (row, conn) => attachIpRecord(await attachLicenseToPc(row, conn), conn),
  notify: { type: 'PC', label: (row) => row.hostname || row.asset_id || row.id },
};

// ---------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------

export const devicesConfig: CrudTableConfig = {
  table: 'devices',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
  autoAssetId: true,
  withDepartment: true,
  beforeInsert: async (body, { conn }) => {
    await checkDeviceDuplicate(body, conn, null);
    await checkAndLinkIp('devices', body, conn, null);
  },
  beforeUpdate: async (body, { conn }, id) => {
    await checkDeviceDuplicate(body, conn, id);
    await checkAndLinkIp('devices', body, conn, id);
  },
  decorate: attachIpRecord,
  notify: { type: 'Device', label: (row) => row.hostname || row.device_model || row.asset_id || row.id },
};

// ---------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------

const SERVER_REQUIRED_FIELDS: [string, string][] = [
  ['hostname', 'Server Name / Hostname'],
  ['ip_address', 'Server IP Address'],
  ['ssh_port', 'SSH Port Number'],
  ['server_type', 'Server Type'],
  ['environment', 'Server Environment'],
  ['server_owner', 'Server Owner'],
  ['ram', 'Resource RAM'],
  ['cpu', 'Resource CPU'],
  ['storage', 'Resource Storage'],
  ['os_release', 'OS Release'],
  ['host_location', 'Host Location'],
];

async function validateServer(body: Row, conn: PoolConnection, isInsert: boolean, currentId: string | null): Promise<void> {
  await checkServerDuplicate(body, conn, currentId);
  for (const [key, label] of SERVER_REQUIRED_FIELDS) {
    if (isInsert && !(key in body)) throw new ApiError(400, `${label} is required`);
    if (key in body) {
      const value = String(body[key] ?? '').trim();
      if (!value) throw new ApiError(400, `${label} is required`);
      if (key !== 'ssh_port') body[key] = value;
    }
  }
  if ('ip_address' in body && !IPV4_RE.test(String(body.ip_address).trim())) {
    throw new ApiError(400, 'Server IP Address must be a valid IPv4 address (e.g., 10.6.13.45)');
  }
  if ('ssh_port' in body) {
    const port = Number(body.ssh_port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ApiError(400, 'SSH Port Number must be a number between 1 and 65535');
  }
  if ('os_release' in body) {
    const [rows] = await conn.query<any[]>('SELECT 1 FROM os_releases WHERE code = ?', [body.os_release]);
    if (!rows[0]) throw new ApiError(400, 'Selected OS Release was not found');
  }
  if ('host_location' in body) {
    const [rows] = await conn.query<any[]>('SELECT 1 FROM host_locations WHERE code = ?', [body.host_location]);
    if (!rows[0]) throw new ApiError(400, 'Selected Host Location was not found');
  }
}

export const serversConfig: CrudTableConfig = {
  table: 'servers',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
  autoAssetId: true,
  beforeInsert: (body, { conn }) => validateServer(body, conn, true, null),
  beforeUpdate: (body, { conn }, id) => validateServer(body, conn, false, id),
  notify: { type: 'Server', label: (row) => row.hostname || row.asset_id || row.id },
};

// ---------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------

export const remindersConfig: CrudTableConfig = {
  table: 'reminders',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
};

// ---------------------------------------------------------------------
// IP Addresses
// ---------------------------------------------------------------------

const IP_MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
const IP_HOSTNAME_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
const IP_STATUS_VALUES = ['assigned', 'reserved', 'available', 'decommissioned'];
const IP_REQUIRED_FIELDS: [string, string][] = [
  ['hostname', 'Hostname'],
  ['department_id', 'Department / Branch'],
  ['mac_address', 'MAC Address'],
  ['patch_panel_label', 'Patch Panel Label / Number'],
  ['status', 'Status'],
  ['access_switch_port', 'Access Switch Port / Interface Number'],
  ['ip_owner', 'IP Address Owner (Employee)'],
  ['subnet_id', 'IP Subnet'],
  ['ip_address', 'IP Address'],
];

function findMatchingSubnet(ip: string, subnets: Row[]): Row | null {
  let best: Row | null = null;
  for (const s of subnets) {
    const prefix = (s.prefix || '').trim();
    if (prefix && ip.startsWith(prefix) && (!best || prefix.length > String(best.prefix).trim().length)) best = s;
  }
  return best;
}

async function validateIpAddress(body: Row, conn: PoolConnection, isInsert: boolean, currentId: string | null): Promise<void> {
  for (const [key, label] of IP_REQUIRED_FIELDS) {
    if (isInsert && !(key in body)) throw new ApiError(400, `${label} is required`);
    if (key in body) {
      const value = String(body[key] ?? '').trim();
      if (!value) throw new ApiError(400, `${label} is required`);
      body[key] = value;
    }
  }
  if ('ip_address' in body && !IPV4_RE.test(body.ip_address)) throw new ApiError(400, 'IP Address must be a valid IPv4 address (e.g., 10.6.1.50)');
  if ('ip_address' in body) {
    const [rows] = await conn.query<any[]>('SELECT id, hostname FROM ip_addresses WHERE ip_address = ? AND id != ?', [body.ip_address, currentId || '']);
    if (rows[0]) {
      throw new ApiError(409, `IP Address ${body.ip_address} is already registered${rows[0].hostname ? ` to "${rows[0].hostname}"` : ''}. Choose a different address.`);
    }
  }
  if ('mac_address' in body && !IP_MAC_RE.test(body.mac_address)) throw new ApiError(400, 'MAC Address must look like 00:1A:2B:3C:4D:5E');
  if ('hostname' in body && !IP_HOSTNAME_RE.test(body.hostname)) {
    throw new ApiError(400, 'Hostname may only contain letters, numbers, hyphens and dots (e.g., PC-HQ-001)');
  }
  if ('status' in body) {
    if (body.status === 'unassigned') throw new ApiError(400, 'Select a status (other than Unassigned) to complete registration');
    if (!IP_STATUS_VALUES.includes(body.status)) throw new ApiError(400, 'Select a valid status');
  }
  if ('department_id' in body) {
    const [rows] = await conn.query<any[]>('SELECT id FROM departments WHERE id = ?', [body.department_id]);
    if (!rows[0]) throw new ApiError(400, 'Selected department/branch was not found');
  }
  if ('patch_panel_label' in body) {
    const [rows] = await conn.query<any[]>('SELECT 1 FROM patch_levels WHERE label = ?', [body.patch_panel_label]);
    if (!rows[0]) throw new ApiError(400, 'Selected Patch Panel Label / Number was not found. Configure one under Customization > Patch / Level Numbers.');
  }
  if ('subnet_id' in body) {
    const [subnetRows] = await conn.query<any[]>('SELECT * FROM ip_subnets WHERE id = ?', [body.subnet_id]);
    const subnet = subnetRows[0];
    if (!subnet) throw new ApiError(400, 'Selected IP Subnet was not found. Configure one under Customization > IP Subnets.');
    if ('ip_address' in body) {
      const prefix = (subnet.prefix || '').trim();
      if (!prefix || !body.ip_address.startsWith(prefix)) throw new ApiError(400, `IP Address does not belong to the selected subnet (${subnet.prefix}).`);
      const [allSubnets] = await conn.query<any[]>('SELECT * FROM ip_subnets');
      const best = findMatchingSubnet(body.ip_address, allSubnets);
      if (best && best.id !== subnet.id) throw new ApiError(400, `IP Address matches a different configured subnet (${best.prefix}). Select that subnet instead.`);
    }
  }
  if ('ip_address' in body) {
    const [existingRows] = await conn.query<any[]>('SELECT id FROM ip_addresses WHERE ip_address = ?', [body.ip_address]);
    if (existingRows[0] && existingRows[0].id !== currentId) {
      throw new ApiError(400, 'This IP Address is already registered/assigned. Choose an available address from the selected subnet.');
    }
  }
}

export const ipAddressesConfig: CrudTableConfig = {
  table: 'ip_addresses',
  insertRoles: WRITE_ROLES,
  updateRoles: WRITE_ROLES,
  deleteRoles: ASSET_DELETE_ROLES,
  withDepartment: true,
  beforeInsert: (body, { conn }) => validateIpAddress(body, conn, true, null),
  beforeUpdate: (body, { conn }, id) => validateIpAddress(body, conn, false, id),
  notify: { type: 'IP Address', label: (row) => row.ip_address || row.id },
};

// ---------------------------------------------------------------------
// Registry: every generic-CRUD table, keyed by its URL segment
// ---------------------------------------------------------------------

export const crudRegistry: Record<string, CrudTableConfig> = {
  departments: departmentsConfig,
  license_types: licenseTypesConfig,
  license_subtypes: licenseSubtypesConfig,
  device_types: deviceTypesConfig,
  pc_form_fields: pcFormFieldsConfig,
  device_owners: deviceOwnersConfig,
  server_owners: serverOwnersConfig,
  vendors: vendorsConfig,
  server_types: serverTypesConfig,
  server_environments: serverEnvironmentsConfig,
  os_releases: osReleasesConfig,
  host_locations: hostLocationsConfig,
  floors: floorsConfig,
  access_switches: accessSwitchesConfig,
  access_switch_ips: accessSwitchIpsConfig,
  patch_levels: patchLevelsConfig,
  ip_subnets: ipSubnetsConfig,
  asset_models: assetModelsConfig,
  reminder_types: reminderTypesConfig,
  pc_registrations: pcRegistrationsConfig,
  licenses: licensesConfig,
  devices: devicesConfig,
  servers: serversConfig,
  reminders: remindersConfig,
  ip_addresses: ipAddressesConfig,
};
