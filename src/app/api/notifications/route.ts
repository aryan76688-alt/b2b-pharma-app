import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const res = await query(
      `SELECT id, type, title, message, reference_type as "referenceType", reference_id as "referenceId",
              is_read as "isRead", created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 40`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [user.id]);
    } else if (notificationId) {
      await query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [notificationId, user.id]);
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
