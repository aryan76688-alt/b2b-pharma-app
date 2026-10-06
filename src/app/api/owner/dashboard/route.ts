import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);

    // 1. KPI Counts & Totals
    const salesRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND status != 'rejected' THEN total_amount ELSE 0 END), 0) as total_sales,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_orders
      FROM orders
    `);

    const partiesCountRes = await query(`SELECT COUNT(*) as count FROM parties WHERE status = 'active'`);
    const productsCountRes = await query(`SELECT COUNT(*) as count FROM products`);
    const salesmenCountRes = await query(`SELECT COUNT(*) as count FROM users WHERE role = 'salesman' AND status = 'active'`);
    const outstandingTotalRes = await query(`SELECT COALESCE(SUM(total_outstanding), 0) as total FROM party_outstanding_snapshots`);

    // 2. Sales Trend (by day or month)
    const salesTrendRes = await query(`
      SELECT 
        TO_CHAR(order_date, 'Mon DD') as date,
        COALESCE(SUM(total_amount), 0) as sales,
        COUNT(*) as orders
      FROM orders
      WHERE status != 'cancelled' AND status != 'rejected'
        AND order_date >= NOW() - INTERVAL '14 days'
      GROUP BY TO_CHAR(order_date, 'Mon DD'), DATE(order_date)
      ORDER BY DATE(order_date) ASC
    `);

    // 3. Salesman Performance Summary
    const salesmenPerfRes = await query(`
      SELECT 
        u.id,
        u.full_name as "fullName",
        u.employee_code as "employeeCode",
        COALESCE(sp.territory, 'Unassigned') as territory,
        COALESCE(sp.target_amount, 100000) as target,
        COUNT(o.id) as "totalOrders",
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as "pendingOrders",
        COUNT(CASE WHEN o.status = 'approved' THEN 1 END) as "approvedOrders",
        COALESCE(SUM(CASE WHEN o.status != 'rejected' AND o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as "totalSales"
      FROM users u
      LEFT JOIN salesman_profiles sp ON u.id = sp.user_id
      LEFT JOIN orders o ON u.id = o.salesman_id
      WHERE u.role = 'salesman' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.employee_code, sp.territory, sp.target_amount
      ORDER BY "totalSales" DESC
    `);


    const settingsRes = await query(`SELECT value FROM app_settings WHERE key = 'near_expiry_threshold'`);
    const thresholdDays = settingsRes.rows.length > 0 ? parseInt(settingsRes.rows[0].value.replace(/['"]/g, '')) || 90 : 90;
    // 4. Near Expiry Products (Replaces Top Products)
    const nearExpiryListRes = await query(`
      SELECT 
        p.id as "productId",
        p.product_name as name,
        p.packing,
        b.batch_no as "batchNo",
        b.expiry_date as "expiryDate",
        b.stock_qty as "stockQty",
        b.ptr,
        EXTRACT(DAY FROM (b.expiry_date::timestamp - CURRENT_DATE::timestamp)) as "daysToExpiry"
      FROM product_batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.expiry_date IS NOT NULL 
        AND b.stock_qty > 0 
        AND b.expiry_date >= CURRENT_DATE - INTERVAL '10 years' 
        AND b.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY b.expiry_date ASC
      LIMIT 6
    `, [thresholdDays]);

    // 5. Recent 8 Orders
    const recentOrdersRes = await query(`
      SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.status,
        o.order_date as "orderDate",
        o.total_amount as "totalAmount",
        o.total_quantity as "totalQuantity",
        o.total_free_quantity as "totalFreeQuantity",
        p.party_name as "partyName",
        u.full_name as "salesmanName"
      FROM orders o
      JOIN parties p ON o.party_id = p.id
      JOIN users u ON o.salesman_id = u.id
      ORDER BY o.order_date DESC
      LIMIT 8
    `);

    // Fetch Near Expiry
    
    
    
    const nearExpiryRes = await query(`
      SELECT COUNT(*) as count 
      FROM product_batches 
      WHERE expiry_date IS NOT NULL 
        AND stock_qty > 0 
        AND expiry_date >= CURRENT_DATE - INTERVAL '10 years' 
        AND expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
    `, [thresholdDays]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSales: Number(salesRes.rows[0]?.total_sales || 0),
          totalOrders: Number(salesRes.rows[0]?.total_orders || 0),
          pendingOrders: Number(salesRes.rows[0]?.pending_orders || 0),
          approvedOrders: Number(salesRes.rows[0]?.approved_orders || 0),
          rejectedOrders: Number(salesRes.rows[0]?.rejected_orders || 0),
          totalParties: Number(partiesCountRes.rows[0]?.count || 0),
          totalProducts: Number(productsCountRes.rows[0]?.count || 0),
          totalSalesmen: Number(salesmenCountRes.rows[0]?.count || 0),
          totalOutstanding: Number(outstandingTotalRes.rows[0]?.total || 0),
          nearExpiryBatches: Number(nearExpiryRes.rows[0]?.count || 0),
        },
        salesTrend: salesTrendRes.rows,
        salesmenPerformance: salesmenPerfRes.rows,
        nearExpiryProducts: nearExpiryListRes.rows,
        recentOrders: recentOrdersRes.rows,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
