import type { PoolConnection, Pool } from 'mysql2/promise';

const ORG_PREFIX = 'GBB';
const SEQ_WIDTH = 3;

const DEVICE_TYPE_CODES: Record<string, string> = {
  network: 'NET', physical_server: 'SRV', storage_server: 'STO', wifi_access_point: 'WAP',
  core_switch: 'CSW', access_switch: 'ASW', ethiotelecom_epon: 'EPO', ethiotelecom_gpon: 'GPO',
  edge_router: 'RTR', distribution_switch: 'DSW', fire_extinguisher: 'FEX', ac: 'ACU', ups: 'UPS',
  monitoring_tv: 'MTV', rack: 'RAK', cctv_camera: 'CAM', digital_signage: 'DSG',
  printer_photocopy: 'PRN', check_scanner: 'CSC', normal_scanner: 'SCN',
};

const LICENSE_TYPE_CODES: Record<string, string> = {
  operating_system: 'OSL', email_365: 'E365', veam_backup: 'BKP', vmware: 'VMW', other: 'LIC',
};

function codeFromText(text: string | undefined | null, fallback: string): string {
  const letters = String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
  return letters ? letters.slice(0, 4).padEnd(3, 'X') : fallback;
}

export function resolveTypeCode(table: string, record: Record<string, any>): string | null {
  switch (table) {
    case 'pc_registrations':
      return 'COMP';
    case 'servers':
      return 'SRV';
    case 'devices':
      return DEVICE_TYPE_CODES[record.device_type] || codeFromText(record.device_type, 'DEV');
    case 'licenses':
      return LICENSE_TYPE_CODES[record.license_type] || codeFromText(record.license_type, 'LIC');
    default:
      return null;
  }
}

/**
 * Atomically reserves the next sequence number for a type code inside
 * an existing transaction (so it's part of the same commit/rollback as
 * the row insert it's for) and returns the formatted asset ID, e.g.
 * "GBB-COMP-001".
 */
export async function nextAssetId(conn: PoolConnection, typeCode: string): Promise<string> {
  // SELECT ... FOR UPDATE serializes concurrent reservations for the
  // same prefix, replacing the effect of better-sqlite3's synchronous
  // transaction in the original.
  const [rows] = await conn.query<any[]>('SELECT next_seq FROM asset_id_counters WHERE prefix = ? FOR UPDATE', [typeCode]);
  let seq: number;
  if (rows.length === 0) {
    seq = 1;
    await conn.query('INSERT INTO asset_id_counters (prefix, next_seq) VALUES (?, ?)', [typeCode, 2]);
  } else {
    seq = rows[0].next_seq;
    await conn.query('UPDATE asset_id_counters SET next_seq = ? WHERE prefix = ?', [seq + 1, typeCode]);
  }
  return `${ORG_PREFIX}-${typeCode}-${String(seq).padStart(SEQ_WIDTH, '0')}`;
}

export async function generateAssetId(conn: PoolConnection, table: string, record: Record<string, any>): Promise<string | null> {
  const typeCode = resolveTypeCode(table, record);
  if (!typeCode) return null;
  return nextAssetId(conn, typeCode);
}
