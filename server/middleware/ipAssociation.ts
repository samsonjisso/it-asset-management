import type { NextFunction, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';

const ENTITY_TABLES: Record<string, string> = {
  pc_registrations: 'PC',
  devices: 'Device',
  servers: 'Server',
};

export async function syncIpAssociation(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PATCH'].includes(req.method)) return next();
  const table = req.baseUrl.split('/').filter(Boolean).pop() || '';
  const entityType = ENTITY_TABLES[table];
  if (!entityType) return next();

  const rawIp = typeof req.body?.ip_address === 'string' ? req.body.ip_address.trim() : '';
  if (!rawIp) {
    if (req.method === 'PATCH') req.body.ip_address_id = null;
    return next();
  }

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT * FROM ip_addresses WHERE ip_address = ? FOR UPDATE', [rawIp]);
      let ip = (rows as any[])[0];

      if (ip) {
        const [owners] = await connection.execute(
          `SELECT id, 'PC' AS entity_type FROM pc_registrations WHERE ip_address_id = ?
           UNION ALL SELECT id, 'Device' FROM devices WHERE ip_address_id = ?
           UNION ALL SELECT id, 'Server' FROM servers WHERE ip_address_id = ?`,
          [ip.id, ip.id, ip.id]
        );
        const currentId = req.method === 'PATCH' ? req.params.id : null;
        const conflicting = (owners as any[]).find((o) => o.id !== currentId || o.entity_type !== entityType);
        if (conflicting) {
          await connection.rollback();
          return res.status(409).json({ error: `IP address ${rawIp} is already assigned to another asset.` });
        }
      } else {
        const id = crypto.randomUUID();
        const ts = new Date().toISOString();
        await connection.execute(
          `INSERT INTO ip_addresses (id, ip_address, hostname, status, created_at, updated_at) VALUES (?, ?, ?, 'assigned', ?, ?)`,
          [id, rawIp, req.body.hostname || null, ts, ts]
        );
        ip = { id };
      }

      req.body.ip_address = rawIp;
      req.body.ip_address_id = ip.id;
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    next();
  } catch (err) {
    const message = (err as Error).message;
    if (/Duplicate entry/i.test(message)) return res.status(409).json({ error: `IP address ${rawIp} is already registered.` });
    return res.status(400).json({ error: message });
  }
}
