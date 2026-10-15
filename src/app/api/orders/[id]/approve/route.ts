import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { triggerN8nWebhook } from '@/lib/n8n';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await requireOwner(req);
    const { id } = await params;

    const orderRes = await query(`SELECT id, order_number, salesman_id, status FROM orders WHERE id = $1`, [id]);
    if (orderRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    const order = orderRes.rows[0];

    if (order.status !== 'pending' && order.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATUS', message: `Cannot approve order currently in '${order.status}' status.` } },
        { status: 400 }
      );
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE orders
         SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now()
         WHERE id = $2`,
        [owner.id, id]
      );

      await client.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
         VALUES ($1, $2, 'approved', $3, 'Order approved by distributor')`,
        [id, order.status, owner.id]
      );

      // Notify salesman
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'ORDER', 'Order Approved', $2, 'ORDER', $3)`,
        [
          order.salesman_id,
          `Your order ${order.order_number} has been approved by the distributor.`,
          id,
        ]
      );
    });

    await logAudit({
      userId: owner.id,
      action: 'APPROVE_ORDER',
      entityType: 'ORDER',
      entityId: id,
    });

    triggerN8nWebhook('ORDER_APPROVED', {
      orderId: id,
      orderNumber: order.order_number,
      approvedBy: owner.fullName,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Order approved successfully.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
