import { Router, type Request, type Response } from 'express';
import { db, nowIso } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth);

interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function toPublicProfile(row: ProfileRow | undefined) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return { ...rest, is_active: !!rest.is_active };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const order = req.query.order === 'created_at' ? 'created_at' : 'created_at';
    const dir = req.query.ascending === 'false' ? 'DESC' : 'ASC';
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(`SELECT * FROM profiles ORDER BY ${order} ${dir}`);
      res.json((rows as ProfileRow[]).map(toPublicProfile));
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
      const row = (rows as ProfileRow[])[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(toPublicProfile(row));
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// A user may update their own profile; only admins may update others
// or change role / active status.
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const isSelf = req.auth!.id === req.params.id;
    const isAdmin = req.auth!.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to update this user' });
    }
    const body: Record<string, unknown> = req.body || {};
    const allowedForSelf = ['full_name', 'phone'];
    const allowedForAdmin = ['full_name', 'phone', 'role', 'is_active'];
    const allowed = isAdmin ? allowedForAdmin : allowedForSelf;

    const setCols: string[] = [];
    const values: unknown[] = [];
    for (const col of allowed) {
      if (col in body) {
        setCols.push(`${col} = ?`);
        values.push(col === 'is_active' ? (body[col] ? 1 : 0) : body[col]);
      }
    }
    setCols.push('updated_at = ?');
    values.push(nowIso());
    values.push(req.params.id);

    const connection = await db.getConnection();
    try {
      const result = await connection.execute(
        `UPDATE profiles SET ${setCols.join(', ')} WHERE id = ?`,
        values as any[]
      );
      if ((result[0] as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });

      const [rows] = await connection.execute('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
      const row = (rows as ProfileRow[])[0];
      res.json(toPublicProfile(row));
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const connection = await db.getConnection();
    try {
      const result = await connection.execute('DELETE FROM profiles WHERE id = ?', [req.params.id]);
      if ((result[0] as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
