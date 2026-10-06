import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    const result = await query(`
      SELECT 
        u.id as "salesmanId",
        u.full_name as "salesmanName",
        u.employee_code as "employeeCode",
        COALESCE(sp.territory, 'All') as territory,
        COALESCE(sp.target_amount, 100000) as "targetAmount",
        COUNT(o.id) as "totalOrders",
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as "pendingOrders",
        COUNT(CASE WHEN o.status = 'approved' THEN 1 END) as "approvedOrders",
        COUNT(CASE WHEN o.status = 'rejected' THEN 1 END) as "rejectedOrders",
        COALESCE(SUM(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as "totalSales",
        COALESCE(AVG(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount END), 0) as "avgOrderValue"
      FROM users u
      LEFT JOIN salesman_profiles sp ON u.id = sp.user_id
      LEFT JOIN orders o ON u.id = o.salesman_id
      WHERE u.role = 'salesman' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.employee_code, sp.territory, sp.target_amount
      ORDER BY "totalSales" DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
