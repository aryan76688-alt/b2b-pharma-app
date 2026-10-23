import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    // Fetch order header
    const orderRes = await query(
      `SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.party_id as "partyId",
        p.party_name as "partyName",
        p.mobile as "partyMobile",
        p.address as "partyAddress",
        p.city as "partyCity",
        p.state as "partyState",
        p.gst_number as "partyGst",
        o.salesman_id as "salesmanId",
        u.full_name as "salesmanName",
        u.mobile as "salesmanMobile",
        o.status,
        o.order_date as "orderDate",
        o.delivery_date as "deliveryDate",
        o.subtotal,
        o.subtotal as "totalWithoutGst",
        o.discount_amount as "discountAmount",
        COALESCE(o.gst_amount, 0.00) as "gstAmount",
        o.total_amount as "totalAmount",
        o.total_amount as "totalWithGst",
        o.total_quantity as "totalQuantity",
        o.total_free_quantity as "totalFreeQuantity",
        o.remarks,
        o.rejection_reason as "rejectionReason",
        o.approved_at as "approvedAt",
        o.created_at as "createdAt",
        approver.full_name as "approvedByName"
      FROM orders o
      JOIN parties p ON o.party_id = p.id
      JOIN users u ON o.salesman_id = u.id
      LEFT JOIN users approver ON o.approved_by = approver.id
      WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    const order = orderRes.rows[0];

    // Salesman isolation: can ONLY view their own order
    if (user.role === 'salesman' && order.salesmanId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to view this order.' } },
        { status: 403 }
      );
    }

    // Fetch items
    const itemsRes = await query(
      `SELECT 
        oi.id,
        oi.product_id as "productId",
        p.product_name as "productName",
        p.packing,
        p.company,
        p.category,
        oi.batch_id as "batchId",
        pb.batch_no as "batchNo",
        oi.quantity,
        oi.free_quantity as "freeQuantity",
        oi.ptr,
        oi.mrp,
        oi.scheme_name as "schemeName",
        oi.discount_amount as "discountAmount",
        oi.line_total as "lineTotal",
        COALESCE(oi.gst_percent, p.gst_percent, 12.00) as "gstPercent",
        COALESCE(oi.gst_amount, ROUND((oi.line_total * COALESCE(oi.gst_percent, p.gst_percent, 12.00) / 100)::numeric, 2)) as "gstAmount"
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_batches pb ON oi.batch_id = pb.id
      WHERE oi.order_id = $1`,
      [id]
    );

    // Fetch status history timeline
    const historyRes = await query(
      `SELECT 
        h.id,
        h.old_status as "oldStatus",
        h.new_status as "newStatus",
        h.remarks,
        h.created_at as "createdAt",
        u.full_name as "changedByName"
      FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.order_id = $1
      ORDER BY h.created_at ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: itemsRes.rows,
        history: historyRes.rows,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
