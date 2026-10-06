import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await requireOwner(req);
    const { id } = await params;
    const body = await req.json();
    const { status, remarks } = body;

    const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'packed', 'dispatched', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATUS', message: 'Invalid status provided.' } },
        { status: 400 }
      );
    }

    const orderRes = await query(`SELECT id, order_number, salesman_id, status FROM orders WHERE id = $1`, [id]);
    if (orderRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    const order = orderRes.rows[0];

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`,
        [status, id]
      );

      await client.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, order.status, status, owner.id, remarks || `Status updated to ${status}`]
      );

      // Notify salesman
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'ORDER', 'Order Status Update', $2, 'ORDER', $3)`,
        [
          order.salesman_id,
          `Order ${order.order_number} status changed to ${status.toUpperCase()}.`,
          id,
        ]
      );
    });

    await logAudit({
      userId: owner.id,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'ORDER',
      entityId: id,
      newData: { status, remarks },
    });

    return NextResponse.json({
      success: true,
      message: `Order status changed to ${status}.`,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
