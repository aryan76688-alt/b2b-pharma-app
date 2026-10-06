import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { query, withTransaction } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await requireOwner(req);
    const { id } = await params;
    const body = await req.json();
    const { rejectionReason } = body;

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is mandatory.' } },
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
        `UPDATE orders
         SET status = 'rejected', rejection_reason = $1, updated_at = now()
         WHERE id = $2`,
        [rejectionReason.trim(), id]
      );

      await client.query(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, remarks)
         VALUES ($1, $2, 'rejected', $3, $4)`,
        [id, order.status, owner.id, `Reason: ${rejectionReason.trim()}`]
      );

      // Notify salesman
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'ORDER', 'Order Rejected', $2, 'ORDER', $3)`,
        [
          order.salesman_id,
          `Your order ${order.order_number} was rejected. Reason: ${rejectionReason.trim()}`,
          id,
        ]
      );
    });

    await logAudit({
      userId: owner.id,
      action: 'REJECT_ORDER',
      entityType: 'ORDER',
      entityId: id,
      newData: { rejectionReason },
    });

    return NextResponse.json({
      success: true,
      message: 'Order rejected.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
