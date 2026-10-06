import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Identifier and password are required.' } },
        { status: 400 }
      );
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const clientIp = req.headers.get('x-forwarded-for') || 'local';

    // Rate limiting: 5 attempts per 15 minutes
    const rateLimitCheck = checkRateLimit(`login:${cleanIdentifier}:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many failed login attempts. Please try again in ${rateLimitCheck.retryAfterSec} seconds.`,
          },
        },
        { status: 429 }
      );
    }

    // Lookup user by email, username, or mobile
    const userRes = await query(
      `SELECT u.id, u.role, u.full_name as "fullName", u.mobile, u.email, u.username,
              u.employee_code as "employeeCode", u.profile_photo_url as "profilePhotoUrl",
              u.status, u.first_login as "firstLogin", u.mpin_created as "mpinCreated",
              s.password_hash, s.mpin_hash
       FROM users u
       JOIN user_security s ON u.id = s.user_id
       WHERE LOWER(u.username) = $1 OR LOWER(u.email) = $1 OR u.mobile = $1`,
      [cleanIdentifier]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials. Please verify your details.' } },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Your account is inactive. Please contact the administrator.' } },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid password. Please check your credentials.' } },
        { status: 401 }
      );
    }

    // Successful password match
    resetRateLimit(`login:${cleanIdentifier}:${clientIp}`);

    // Update last login
    await query(`UPDATE users SET last_login_at = timezone('utc'::text, now()) WHERE id = $1`, [user.id]);

    await logAudit({
      userId: user.id,
      action: 'LOGIN_PASSWORD',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: clientIp,
    });

    // Sign JWT
    const token = signToken({
      userId: user.id,
      role: user.role,
      username: user.username,
    });

    const sanitizedUser = {
      id: user.id,
      role: user.role,
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      username: user.username,
      employeeCode: user.employeeCode,
      profilePhotoUrl: user.profilePhotoUrl,
      status: user.status,
      firstLogin: user.firstLogin,
      mpinCreated: user.mpinCreated,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: sanitizedUser,
        
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('shreeji_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[Login API Error]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to authenticate. Please try again.' } },
      { status: 500 }
    );
  }
}
