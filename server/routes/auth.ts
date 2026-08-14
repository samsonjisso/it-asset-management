import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, nowIso } from '../db.js';
import { signToken, requireAuth, requireRole, type UserRole } from '../auth.js';

const router = Router();

interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM profiles WHERE email = ?', [email]);
      const row = (rows as ProfileRow[])[0];
      if (!row || !bcrypt.compareSync(password, row.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (!row.is_active) {
        return res.status(403).json({ error: 'Your account has been disabled. Contact your administrator.' });
      }
      const token = signToken({ id: row.id, email: row.email, role: row.role });
      const profile = toPublicProfile(row)!;
      res.json({ token, user: { id: profile.id, email: profile.email }, profile });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM profiles WHERE id = ?', [req.auth!.id]);
      const row = (rows as ProfileRow[])[0];
      if (!row) return res.status(401).json({ error: 'Account no longer exists' });
      const profile = toPublicProfile(row)!;
      res.json({ user: { id: profile.id, email: profile.email }, profile });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const connection = await db.getConnection();
    try {
      await connection.execute('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?', [
        hash,
        nowIso(),
        req.auth!.id,
      ]);
      res.json({ ok: true });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Admin-only: create a brand new user + profile in one step.
router.post('/admin/create-user', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role, phone } = req.body || {};
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password and full name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT id FROM profiles WHERE email = ?', [email]);
      if ((rows as any[]).length > 0) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);
      const ts = nowIso();
      await connection.execute(
        `INSERT INTO profiles (id, email, password_hash, full_name, role, phone, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, email, hash, full_name, role || 'register_user', phone || null, ts, ts]
      );
      res.status(201).json({ user: { id, email } });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
