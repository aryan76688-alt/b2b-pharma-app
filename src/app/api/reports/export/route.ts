import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { createExcelBuffer } from '@/lib/excel';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'orders';

    let data: any[] = [];
    let filename = `shreeji_${type}_report.xlsx`;
    let sheetName = 'Report';

    if (type === 'orders') {
      sheetName = 'Orders_Report';
      const res = await query(`
        SELECT 
          o.order_number as "Order No",
          p.party_name as "Party Name",
          p.city as "City",
          u.full_name as "Salesman",
          o.status as "Status",
          o.order_date::date::text as "Order Date",
          o.total_quantity as "Sale Qty",
          o.total_free_quantity as "Free Qty",
          o.total_amount as "Order Amount (INR)"
        FROM orders o
        JOIN parties p ON o.party_id = p.id
        JOIN users u ON o.salesman_id = u.id
        ORDER BY o.order_date DESC
      `);
      data = res.rows;
    } else if (type === 'outstanding') {
      sheetName = 'Outstanding_Report';
      const res = await query(`
        SELECT 
          p.party_name as "Party Name",
          p.party_code as "Party Code",
          p.mobile as "Mobile",
          p.city as "City",
          u.full_name as "Salesman",
          pos.total_outstanding as "Outstanding (INR)",
          pos.pending_days as "Pending Days",
          pos.last_bill_date::text as "Last Bill Date",
          pos.last_payment_date::text as "Last Payment Date"
        FROM parties p
        LEFT JOIN users u ON p.assigned_salesman_id = u.id
        LEFT JOIN (
          SELECT DISTINCT ON (party_id) party_id, total_outstanding, pending_days, last_bill_date, last_payment_date
          FROM party_outstanding_snapshots
          ORDER BY party_id, snapshot_date DESC
        ) pos ON p.id = pos.party_id
        WHERE p.status = 'active'
        ORDER BY pos.total_outstanding DESC
      `);
      data = res.rows;
    } else if (type === 'stock') {
      sheetName = 'Stock_Report';
      const res = await query(`
        SELECT 
          p.product_name as "Product Name",
          p.company as "Company",
          p.category as "Category",
          p.packing as "Packing",
          pb.batch_no as "Batch No",
          pb.expiry_date::text as "Expiry Date",
          pb.mrp as "MRP",
          pb.ptr as "PTR",
          pb.stock_qty as "Stock Qty",
          pb.free_qty as "Free Qty"
        FROM product_batches pb
        JOIN products p ON pb.product_id = p.id
        ORDER BY p.product_name ASC
      `);
      data = res.rows;
    }

    const buffer = createExcelBuffer(sheetName, data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
