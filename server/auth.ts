import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db/database.ts';
import { User, AuditLog } from './types/index.ts';

// In-memory rate limiting map for brute-force protection
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(limit: number = 20, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please try again in a few moments.'
      });
    }

    entry.count += 1;
    next();
  };
}

// SSRF Protection: prevents fetching internal network ranges or metadata endpoints
export function isSafeExternalUrl(inputUrl: string): boolean {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    // Block localhost, link-local, loopback, private RFC1918 addresses
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host === 'metadata.google.internal' ||
      host === '169.254.169.254'
    ) {
      return false;
    }

    // Block private IP prefixes
    if (
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Generate secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session in DB
export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insert.run(token, userId, expiresAt, now);

  return { token, expiresAt };
}

// Validate token and retrieve user
export function getUserBySessionToken(token: string): (User & { role_name: string }) | null {
  if (!token) return null;

  const now = new Date().toISOString();
  const query = db.prepare(`
    SELECT u.id, u.username, u.email, u.password_hash, u.role_id,
           u.must_change_password, u.is_active, u.created_at, u.updated_at,
           r.name as role_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
  `);

  const user = query.get(token, now) as any;
  if (!user) return null;

  return {
    ...user,
    must_change_password: Boolean(user.must_change_password),
    is_active: Boolean(user.is_active)
  };
}

// Invalidate session
export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// Extend Request interface with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User & { role_name: string };
}

// Authentication middleware for /api/admin/*
export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Extract token from cookie or Authorization header
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const tokenFromCustom = req.headers['x-auth-token']?.toString();
  const tokenFromCookie = req.cookies?.techorbit_auth_token;

  const token = tokenFromHeader || tokenFromCustom || tokenFromCookie;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Authentication required',
      authenticated: false
    });
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized: Session expired or invalid',
      authenticated: false
    });
  }

  req.user = user;
  next();
}

// Password verification and change helpers
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}
