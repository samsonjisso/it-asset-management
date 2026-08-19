import crypto from 'node:crypto';
import type { Row } from './crud.js';

const TABLE_TO_TYPE: Record<string,string> = { pc_registrations:'PC', devices:'Device', servers:'Server' };

export async function syncIpForEntity(connection:any, table:string, entityId:string, body:Row) {
  const entityType = TABLE_TO_TYPE[table];
  if (!entityType || !body.ip_address) return;
  const rawIp = String(body.ip_address).trim();
  if (!rawIp) return;

  const [rows] = await connection.execute('SELECT * FROM ip_addresses WHERE ip_address = ? FOR UPDATE', [rawIp]);
  let ip = (rows as any[])[0];
  if (!ip) {
    const id = crypto.randomUUID(); const ts = new Date().toISOString();
    await connection.execute(
      `INSERT INTO ip_addresses (id, ip_address, hostname, mac_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'assigned', ?, ?)`,
      [id, rawIp, body.hostname || null, body.mac_address || null, ts, ts]
    );
    ip = { id };
  }

  const [owners] = await connection.execute(
    `SELECT id, 'PC' AS entity_type FROM pc_registrations WHERE ip_address_id = ?
     UNION ALL SELECT id, 'Device' FROM devices WHERE ip_address_id = ?
     UNION ALL SELECT id, 'Server' FROM servers WHERE ip_address_id = ?`,
    [ip.id, ip.id, ip.id]
  );
  const conflict = (owners as any[]).find(o => o.id !== entityId || o.entity_type !== entityType);
  if (conflict) throw new Error(`IP address ${rawIp} is already assigned to another asset.`);

  const ts = new Date().toISOString();
  await connection.execute('UPDATE ip_addresses SET hostname = COALESCE(?, hostname), mac_address = COALESCE(?, mac_address), status = \'assigned\', updated_at = ? WHERE id = ?', [body.hostname || null, body.mac_address || null, ts, ip.id]);
  await connection.execute(`UPDATE ${table} SET ip_address_id = ? WHERE id = ?`, [ip.id, entityId]);
}

export async function clearAndSyncIpForUpdate(connection:any, table:string, entityId:string, body:Row) {
  const [oldRows] = await connection.execute(`SELECT ip_address_id FROM ${table} WHERE id = ? FOR UPDATE`, [entityId]);
  const oldId = (oldRows as any[])[0]?.ip_address_id;
  if (!body.ip_address) {
    await connection.execute(`UPDATE ${table} SET ip_address_id = NULL WHERE id = ?`, [entityId]);
    return;
  }
  await syncIpForEntity(connection, table, entityId, body);
  if (oldId && body.ip_address) {
    const [oldIpRows] = await connection.execute('SELECT ip_address FROM ip_addresses WHERE id = ?', [oldId]);
    const oldIp = (oldIpRows as any[])[0]?.ip_address;
    if (oldIp && oldIp.ip_address !== body.ip_address) {
      const [refs] = await connection.execute(
        `SELECT COUNT(*) AS c FROM pc_registrations WHERE ip_address_id = ? UNION ALL SELECT COUNT(*) FROM devices WHERE ip_address_id = ? UNION ALL SELECT COUNT(*) FROM servers WHERE ip_address_id = ?`,
        [oldId, oldId, oldId]
      );
      if ((refs as any[]).reduce((n,r)=>n+Number(r.c||0),0) === 0) await connection.execute(`UPDATE ip_addresses SET status='available', updated_at=? WHERE id=?`, [new Date().toISOString(), oldId]);
    }
  }
}
