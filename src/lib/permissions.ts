import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/types';
import { getAuthUser } from './auth';

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 401, code = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function requireAuth(req?: NextRequest): Promise<User> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new AuthError('Authentication required. Please sign in.', 401, 'UNAUTHENTICATED');
  }
  return user;
}

export async function requireRole(role: UserRole | UserRole[], req?: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Access denied. Role '${user.role}' is not authorized for this resource.`,
      403,
      'UNAUTHORIZED_ROLE'
    );
  }
  return user;
}

export async function requireOwner(req?: NextRequest): Promise<User> {
  return requireRole(['super_admin', 'owner', 'admin'], req);
}

export async function requireSalesman(req?: NextRequest): Promise<User> {
  return requireRole('salesman', req);
}

export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error('[Unhandled API Error]', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      },
    },
    { status: 500 }
  );
}
