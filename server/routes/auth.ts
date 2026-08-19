import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sendMail } from '../mailer.js';
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
  must_change_password?: number;
  created_at: string;
  updated_at: string;
}

function toPublicProfile(row: ProfileRow | undefined) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return { ...rest, is_active: !!rest.is_active, must_change_password: !!rest.must_change_password };
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
        `INSERT INTO profiles (id, email, password_hash, full_name, role, phone, is_active, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
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


// Forgot-password flow. The request endpoint intentionally returns the same
// response whether or not the email exists, preventing account enumeration.
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const generic = 'If an account exists for that email, a password reset link has been sent.';
    if (!email) return res.json({ message: generic });

    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute('SELECT id, email, full_name, is_active FROM profiles WHERE email = ?', [email]);
      const user = (rows as any[])[0];
      if (!user || !user.is_active) return res.json({ message: generic });

      await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < ?', [user.id, nowIso()]);
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenId = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await connection.execute(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        [tokenId, user.id, tokenHash, expires, nowIso()]
      );

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      await sendMail({
        to: user.email,
        subject: 'Goh Betoch Bank Asset Inventory password reset',
        text: `Hello ${user.full_name},\n\nUse this link to reset your password. It expires in 30 minutes:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
        html: `<p>Hello ${user.full_name},</p><p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, ignore this email.</p>`,
      });
    } finally {
      connection.release();
    }
    return res.json({ message: generic });
  } catch (err) {
    console.error('Forgot-password error:', err);
    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'A valid reset token and a password of at least 6 characters are required.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const connection = await db.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
        [tokenHash, nowIso()]
      );
      const reset = (rows as any[])[0];
      if (!reset) return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });

      const hash = bcrypt.hashSync(password, 10);
      await connection.beginTransaction();
      await connection.execute('UPDATE profiles SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?', [hash, nowIso(), reset.user_id]);
      await connection.execute('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [nowIso(), reset.id]);
      await connection.commit();
      return res.json({ ok: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
