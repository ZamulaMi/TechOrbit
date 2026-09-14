import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.ts';
import { createSession, deleteSession, requireAdminAuth, AuthenticatedRequest, rateLimit } from '../auth.ts';
import { AuditService } from '../services/audit.service.ts';
import { User } from '../types/index.ts';

export const authRouter = Router();

// POST /api/admin/login
authRouter.post('/login', rateLimit(10, 60000), (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = ? AND u.is_active = 1
  `).get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { token, expiresAt } = createSession(user.id);

  // Set secure cookie
  res.cookie('techorbit_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  AuditService.log({
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'auth',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      must_change_password: Boolean(user.must_change_password)
    }
  });
});

// POST /api/admin/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.techorbit_auth_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    deleteSession(token);
  }
  res.clearCookie('techorbit_auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/admin/me
authRouter.get('/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

// POST /api/admin/change-password
authRouter.post('/change-password', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  // Verify current password against database
  const dbUser = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
  if (!bcrypt.compareSync(currentPassword, dbUser.password_hash)) {
    return res.status(400).json({ error: 'Current password does not match' });
  }

  // Validate complexity: min 8 chars
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE users SET
      password_hash = ?,
      must_change_password = 0,
      updated_at = ?
    WHERE id = ?
  `).run(newHash, now, user.id);

  AuditService.log({
    userId: user.id,
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    success: true,
    message: 'Password updated successfully. Forced change requirement cleared.'
  });
});
