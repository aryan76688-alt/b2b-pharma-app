import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

    let queryText = `
      SELECT 
        u.id,
        u.role,
        u.full_name as "fullName",
        u.mobile,
        u.email,
        u.username,
        u.employee_code as "employeeCode",
        u.profile_photo_url as "profilePhotoUrl",
        u.status,
        u.mpin_created as "mpinCreated",
        u.last_login_at as "lastLoginAt",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt"
      FROM users u
      WHERE 1=1
    `;
    const params: any[] = [];

    if (roleFilter && roleFilter !== 'all') {
      params.push(roleFilter);
      queryText += ` AND u.role = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      queryText += ` AND (LOWER(u.full_name) LIKE $${idx} OR LOWER(u.username) LIKE $${idx} OR LOWER(u.email) LIKE $${idx} OR u.mobile LIKE $${idx})`;
    }

    queryText += ` ORDER BY u.created_at DESC`;

    const result = await query(queryText, params);

    // Get count breakdown by role
    const countRes = await query(`
      SELECT 
        role,
        COUNT(*)::int as count
      FROM users
      GROUP BY role
    `);

    const roleCounts: Record<string, number> = {
      total: result.rows.length,
      super_admin: 0,
      owner: 0,
      admin: 0,
      salesman: 0,
      chemist: 0,
    };

    countRes.rows.forEach(r => {
      if (roleCounts[r.role] !== undefined) {
        roleCounts[r.role] = r.count;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        users: result.rows,
        roleCounts,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireOwner(req);
    const body = await req.json();

    const {
      fullName,
      mobile,
      email,
      username,
      password,
      role = 'salesman',
      employeeCode,
      status = 'active',
      territory,
    } = body;

    if (!fullName || !mobile || !email || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Full name, mobile, email, username, and password are required.',
          },
        },
        { status: 400 }
      );
    }

    // Role check: Only super_admin or owner can assign super_admin role
    if (role === 'super_admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only a Super Admin can create other Super Admin accounts.',
          },
        },
        { status: 403 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim();

    // Check duplicate
    const existing = await query(
      `SELECT id FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2 OR mobile = $3`,
      [cleanUsername, cleanEmail, cleanMobile]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_USER',
            message: 'A user with this username, email, or mobile already exists.',
          },
        },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);
    const empCode = employeeCode || `SH${Math.floor(100 + Math.random() * 900)}`;

    const newUser = await withTransaction(async (client) => {
      // 1. Insert into users
      const userRes = await client.query(
        `INSERT INTO users (role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
         RETURNING id, role, full_name as "fullName", mobile, email, username, employee_code as "employeeCode", status, created_at as "createdAt"`,
        [role, fullName, cleanMobile, cleanEmail, cleanUsername, empCode, status]
      );
      const user = userRes.rows[0];

      // 2. Insert into user_security
      await client.query(
        `INSERT INTO user_security (user_id, password_hash)
         VALUES ($1, $2)`,
        [user.id, hashedPassword]
      );

      // 3. If salesman, also create salesman profile
      if (role === 'salesman') {
        await client.query(
          `INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount, manager_user_id)
           VALUES ($1, $2, $3, CURRENT_DATE, 100000.00, $4)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id, empCode, territory || 'Main Territory', currentUser.id]
        );
      }

      return user;
    });

    await logAudit({
      userId: currentUser.id,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      newData: { fullName, username: cleanUsername, role, employeeCode: empCode, status },
    });

    return NextResponse.json(
      {
        success: true,
        message: `User '${fullName}' (${role}) created successfully.`,
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAuthError(error);
  }
}
