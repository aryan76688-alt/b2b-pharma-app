import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'sales';
    const period = searchParams.get('period') || 'this_month'; // 'today', 'this_week', 'this_month', 'all'

    // Calculate date filter
    let dateCondition = '';
    if (period === 'today') {
      dateCondition = `AND o.order_date >= CURRENT_DATE`;
    } else if (period === 'this_week') {
      dateCondition = `AND o.order_date >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (period === 'this_month') {
      dateCondition = `AND o.order_date >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    if (user.role === 'salesman') {
      // Salesman personal reports ONLY
      const personalSummaryRes = await query(`
        SELECT 
          COUNT(o.id) as "totalOrders",
          COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as "pendingOrders",
          COUNT(CASE WHEN o.status = 'approved' THEN 1 END) as "approvedOrders",
          COUNT(CASE WHEN o.status = 'rejected' THEN 1 END) as "rejectedOrders",
          COALESCE(SUM(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as "totalSales",
          COALESCE(SUM(o.total_quantity), 0) as "totalQuantity",
          COALESCE(SUM(o.total_free_quantity), 0) as "totalFreeQuantity",
          COALESCE(AVG(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount END), 0) as "avgOrderValue"
        FROM orders o
        WHERE o.salesman_id = $1 ${dateCondition}
      `, [user.id]);

      const profileRes = await query(`SELECT target_amount, territory FROM salesman_profiles WHERE user_id = $1`, [user.id]);
      const targetAmount = Number(profileRes.rows[0]?.target_amount || 100000);
      const territory = profileRes.rows[0]?.territory || 'My Area';

      const topPartiesRes = await query(`
        SELECT p.party_name as "partyName", p.city, COUNT(o.id) as "orderCount", COALESCE(SUM(o.total_amount), 0) as "totalSales"
        FROM orders o
        JOIN parties p ON o.party_id = p.id
        WHERE o.salesman_id = $1 AND o.status != 'rejected' AND o.status != 'cancelled' ${dateCondition}
        GROUP BY p.party_name, p.city
        ORDER BY "totalSales" DESC
        LIMIT 5
      `, [user.id]);

      const salesTrendRes = await query(`
        SELECT TO_CHAR(o.order_date, 'Mon DD') as date, COALESCE(SUM(o.total_amount), 0) as sales
        FROM orders o
        WHERE o.salesman_id = $1 AND o.status != 'rejected' AND o.status != 'cancelled'
        GROUP BY TO_CHAR(o.order_date, 'Mon DD'), DATE(o.order_date)
        ORDER BY DATE(o.order_date) ASC
        LIMIT 14
      `, [user.id]);

      const partiesCountRes = await query(`SELECT COUNT(*) as count FROM parties WHERE assigned_salesman_id = $1 AND status = 'active'`, [user.id]);

      return NextResponse.json({
        success: true,
        data: {
          role: 'salesman',
          summary: {
            ...personalSummaryRes.rows[0],
            targetAmount,
            territory,
            myParties: Number(partiesCountRes.rows[0]?.count || 0),
            achievementPercent: targetAmount > 0 
              ? Math.min(100, Math.round((Number(personalSummaryRes.rows[0]?.totalSales || 0) / targetAmount) * 100))
              : 0,
          },
          topParties: topPartiesRes.rows,
          salesTrend: salesTrendRes.rows,
        },
      });
    }

    // Owner reports
    if (type === 'salesmen') {
      const salesmenRes = await query(`
        SELECT 
          u.id as "salesmanId",
          u.full_name as "salesmanName",
          u.employee_code as "employeeCode",
          sp.territory,
          sp.target_amount as "targetAmount",
          COUNT(o.id) as "totalOrders",
          COALESCE(SUM(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as "totalSales",
          COALESCE(AVG(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount END), 0) as "avgOrderValue"
        FROM users u
        LEFT JOIN salesman_profiles sp ON u.id = sp.user_id
        LEFT JOIN orders o ON u.id = o.salesman_id ${dateCondition}
        WHERE u.role = 'salesman' AND u.status = 'active'
        GROUP BY u.id, u.full_name, u.employee_code, sp.territory, sp.target_amount
        ORDER BY "totalSales" DESC
      `);

      return NextResponse.json({ success: true, data: salesmenRes.rows });
    }

    if (type === 'expiry') {
      const expiryRes = await query(`
        SELECT 
          p.product_name as "productName",
          p.company,
          p.packing,
          pb.batch_no as "batchNo",
          pb.expiry_date::text as "expiryDate",
          pb.mrp,
          pb.ptr,
          pb.stock_qty as "stockQty",
          CASE 
            WHEN pb.expiry_date <= CURRENT_DATE THEN 'Expired'
            WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'Near Expiry'
            ELSE 'Valid'
          END as "expiryStatus"
        FROM product_batches pb
        JOIN products p ON pb.product_id = p.id
        WHERE pb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY pb.expiry_date ASC
      `);

      return NextResponse.json({ success: true, data: expiryRes.rows });
    }

    // Default: Overall Sales & Orders report
    const overallRes = await query(`
      SELECT 
        TO_CHAR(o.order_date, 'YYYY-MM-DD') as date,
        COUNT(o.id) as "ordersCount",
        COALESCE(SUM(o.total_amount), 0) as "totalSales",
        COALESCE(SUM(o.total_quantity), 0) as "totalQuantity",
        COALESCE(SUM(o.total_free_quantity), 0) as "totalFreeQuantity"
      FROM orders o
      WHERE o.status != 'rejected' AND o.status != 'cancelled' ${dateCondition}
      GROUP BY TO_CHAR(o.order_date, 'YYYY-MM-DD'), DATE(o.order_date)
      ORDER BY DATE(o.order_date) DESC
    `);

    return NextResponse.json({
      success: true,
      data: overallRes.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
