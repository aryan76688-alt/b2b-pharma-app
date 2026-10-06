import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const res = await query(`
      SELECT 
        a.id,
        a.user_id as "userId",
        u.full_name as "userName",
        u.role as "userRole",
        a.action,
        a.entity_type as "entityType",
        a.entity_id as "entityId",
        a.old_data as "oldData",
        a.new_data as "newData",
        a.ip_address as "ipAddress",
        a.created_at as "createdAt"
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
