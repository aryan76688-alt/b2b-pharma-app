import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { User, UserRole } from '@/types';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'shreeji-healthcare-secret-token-key-super-secure-production-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  username: string;
}

// Blocked weak MPIN combinations
const WEAK_MPINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '3210', '1212', '2121', '6969'
]);

export function isWeakMpin(mpin: string): boolean {
  if (!/^\d{4}$/.test(mpin)) return true;
  return WEAK_MPINS.has(mpin);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashMpin(mpin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${mpin}:${salt}`).digest('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(req?: NextRequest): Promise<User | null> {
  let token: string | undefined;

  // 1. Try Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 2. Try HTTP-only cookie
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('shreeji_session')?.value;
    } catch {
      // If called in an environment without cookies()
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  const result = await query(
    `SELECT id, role, full_name as "fullName", mobile, email, username,
            employee_code as "employeeCode", profile_photo_url as "profilePhotoUrl",
            status, first_login as "firstLogin", mpin_created as "mpinCreated",
            last_login_at as "lastLoginAt", created_at as "createdAt", updated_at as "updatedAt"
     FROM users WHERE id = $1 AND status = 'active'`,
    [payload.userId]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0] as User;
}
