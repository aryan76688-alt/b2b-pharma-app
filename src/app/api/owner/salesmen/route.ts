import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const result = await query(`
      SELECT 
        u.id,
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
        COALESCE(sp.territory, 'Not specified') as territory,
        COALESCE(sp.joining_date::text, u.created_at::date::text) as "joiningDate",
        COALESCE(sp.target_amount, 100000.00) as "targetAmount",
        COUNT(DISTINCT o.id) as "totalOrders",
        COALESCE(SUM(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as "totalSales",
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as "pendingOrders",
        COUNT(DISTINCT CASE WHEN o.status = 'approved' THEN o.id END) as "approvedOrders",
        COUNT(DISTINCT p.id) as "totalParties"
      FROM users u
      LEFT JOIN salesman_profiles sp ON u.id = sp.user_id
      LEFT JOIN orders o ON u.id = o.salesman_id
      LEFT JOIN parties p ON u.id = p.assigned_salesman_id
      WHERE u.role = 'salesman'
      GROUP BY u.id, u.full_name, u.mobile, u.email, u.username, u.employee_code, u.profile_photo_url, u.status, u.mpin_created, u.last_login_at, u.created_at, sp.territory, sp.joining_date, sp.target_amount
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();

    const {
      fullName,
      mobile,
      email,
      username,
      password,
      employeeCode,
      territory,
      joiningDate,
      targetAmount,
    } = body;

    if (!fullName || !mobile || !email || !username || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Full name, mobile, email, username, and password are required.' } },
        { status: 400 }
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
        { success: false, error: { code: 'DUPLICATE_USER', message: 'A user with this username, email, or mobile already exists.' } },
        { status: 409 }
      );
    }

    const hashedPassword = hashPassword(password);
    const empCode = employeeCode || `SH${Math.floor(100 + Math.random() * 900)}`;

    const newSalesman = await withTransaction(async (client) => {
      // 1. Insert user
      const userRes = await client.query(
        `INSERT INTO users (role, full_name, mobile, email, username, employee_code, status, first_login, mpin_created)
         VALUES ('salesman', $1, $2, $3, $4, $5, 'active', true, false)
         RETURNING id, role, full_name as "fullName", mobile, email, username, employee_code as "employeeCode", status`,
        [fullName, cleanMobile, cleanEmail, cleanUsername, empCode]
      );
      const user = userRes.rows[0];

      // 2. Insert user_security
      await client.query(
        `INSERT INTO user_security (user_id, password_hash)
         VALUES ($1, $2)`,
        [user.id, hashedPassword]
      );

      // 3. Insert salesman_profile
      await client.query(
        `INSERT INTO salesman_profiles (user_id, employee_code, territory, joining_date, target_amount, manager_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          empCode,
          territory || 'Unassigned',
          joiningDate || new Date().toISOString().split('T')[0],
          targetAmount || 100000.00,
          owner.id,
        ]
      );

      return user;
    });

    await logAudit({
      userId: owner.id,
      action: 'CREATE_SALESMAN',
      entityType: 'USER',
      entityId: newSalesman.id,
      newData: { fullName, username: cleanUsername, employeeCode: empCode, territory },
    });

    return NextResponse.json({
      success: true,
      message: 'Salesman account created successfully. They can now login.',
      data: newSalesman,
    }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const owner = await requireOwner(req);
    const body = await req.json();
    const { salesmanId, targetAmount } = body;

    if (!salesmanId || targetAmount === undefined || isNaN(Number(targetAmount))) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Salesman ID and valid target amount are required.' } },
        { status: 400 }
      );
    }

    const numericTarget = Math.max(0, Number(targetAmount));

    await query(
      `INSERT INTO salesman_profiles (user_id, target_amount)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET target_amount = $2`,
      [salesmanId, numericTarget]
    );

    await logAudit({
      userId: owner.id,
      action: 'UPDATE_SALESMAN_TARGET',
      entityType: 'SALESMAN_PROFILE',
      entityId: salesmanId,
      newData: { targetAmount: numericTarget },
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly sales target updated successfully',
      data: { salesmanId, targetAmount: numericTarget },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

