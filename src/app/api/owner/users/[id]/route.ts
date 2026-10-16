import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner(req);
    const { id } = await params;

    const res = await query(
      `SELECT 
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
       WHERE u.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
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
    const currentUser = await requireOwner(req);
    const { id } = await params;
    const body = await req.json();

    const {
      fullName,
      mobile,
      email,
      role,
      status,
      employeeCode,
      password,
    } = body;

    // Fetch existing user
    const existingRes = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 }
      );
    }
    const existing = existingRes.rows[0];

    // Restrict assigning super_admin to super_admin caller only
    if (role === 'super_admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only a Super Admin can assign the Super Admin role.' } },
        { status: 403 }
      );
    }

    // Perform update in transaction
    const updatedUser = await withTransaction(async (client) => {
      const updates: string[] = [];
      const values: any[] = [];

      if (fullName !== undefined) {
        values.push(fullName);
        updates.push(`full_name = $${values.length}`);
      }
      if (mobile !== undefined) {
        values.push(String(mobile).trim());
        updates.push(`mobile = $${values.length}`);
      }
      if (email !== undefined) {
        values.push(String(email).trim().toLowerCase());
        updates.push(`email = $${values.length}`);
      }
      if (role !== undefined) {
        values.push(role);
        updates.push(`role = $${values.length}`);
      }
      if (status !== undefined) {
        values.push(status);
        updates.push(`status = $${values.length}`);
      }
      if (employeeCode !== undefined) {
        values.push(employeeCode);
        updates.push(`employee_code = $${values.length}`);
      }

      updates.push(`updated_at = timezone('utc'::text, now())`);

      values.push(id);
      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, role, full_name as "fullName", mobile, email, username, employee_code as "employeeCode", status, updated_at as "updatedAt"
      `;

      const userRes = await client.query(updateQuery, values);

      // If new password is provided, update password_hash in user_security
      if (password && password.trim()) {
        const hashed = hashPassword(password.trim());
        await client.query(
          `UPDATE user_security SET password_hash = $1, updated_at = timezone('utc'::text, now()) WHERE user_id = $2`,
          [hashed, id]
        );
      }

      return userRes.rows[0];
    });

    await logAudit({
      userId: currentUser.id,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      oldData: { fullName: existing.full_name, role: existing.role, status: existing.status },
      newData: updatedUser,
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireOwner(req);
    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: { code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own active account.' } },
        { status: 400 }
      );
    }

    const res = await query(`DELETE FROM users WHERE id = $1 RETURNING id, full_name as "fullName", username`, [id]);
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 }
      );
    }

    await logAudit({
      userId: currentUser.id,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      oldData: res.rows[0],
    });

    return NextResponse.json({
      success: true,
      message: `User '${res.rows[0].fullName}' deleted successfully.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
