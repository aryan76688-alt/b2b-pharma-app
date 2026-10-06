import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner(req);
    const { id } = await params;

    const userRes = await query(
      `SELECT u.id, u.role, u.full_name as "fullName", u.mobile, u.email, u.username,
              u.employee_code as "employeeCode", u.status, u.mpin_created as "mpinCreated",
              u.last_login_at as "lastLoginAt", u.created_at as "createdAt",
              sp.territory, sp.joining_date::text as "joiningDate", sp.target_amount as "targetAmount"
       FROM users u
       LEFT JOIN salesman_profiles sp ON u.id = sp.user_id
       WHERE u.id = $1 AND u.role = 'salesman'`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Salesman not found' } },
        { status: 404 }
      );
    }

    const salesman = userRes.rows[0];

    // Get orders
    const ordersRes = await query(
      `SELECT o.id, o.order_number as "orderNumber", o.status, o.order_date as "orderDate",
              o.total_amount as "totalAmount", o.total_quantity as "totalQuantity",
              o.total_free_quantity as "totalFreeQuantity", p.party_name as "partyName"
       FROM orders o
       JOIN parties p ON o.party_id = p.id
       WHERE o.salesman_id = $1
       ORDER BY o.order_date DESC`,
      [id]
    );

    // Get assigned parties
    const partiesRes = await query(
      `SELECT id, party_code as "partyCode", party_name as "partyName", mobile, city, area,
              credit_limit as "creditLimit", opening_balance as "openingBalance"
       FROM parties
       WHERE assigned_salesman_id = $1 AND status = 'active'`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        profile: salesman,
        orders: ordersRes.rows,
        parties: partiesRes.rows,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await requireOwner(req);
    const { id } = await params;
    const body = await req.json();
    const { status, territory, targetAmount, resetPassword } = body;

    if (status) {
      await query(`UPDATE users SET status = $1, updated_at = now() WHERE id = $2`, [status, id]);
    }

    if (territory || targetAmount !== undefined) {
      await query(
        `UPDATE salesman_profiles
         SET territory = COALESCE($1, territory),
             target_amount = COALESCE($2, target_amount),
             updated_at = now()
         WHERE user_id = $3`,
        [territory, targetAmount, id]
      );
    }

    if (resetPassword) {
      const hashed = hashPassword(resetPassword);
      await query(`UPDATE user_security SET password_hash = $1, updated_at = now() WHERE user_id = $2`, [hashed, id]);
    }

    await logAudit({
      userId: owner.id,
      action: 'UPDATE_SALESMAN',
      entityType: 'USER',
      entityId: id,
      newData: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Salesman profile updated successfully.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
