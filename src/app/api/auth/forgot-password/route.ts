import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Identifier is required.' } },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // Check user exists
    const userRes = await query(
      `SELECT id, full_name, email, mobile, role FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1 OR mobile = $1`,
      [cleanId]
    );

    if (userRes.rows.length === 0) {
      // Don't disclose account existence for security
      return NextResponse.json({
        success: true,
        message: 'If an account matches this identifier, password recovery instructions or an admin notification has been logged.',
      });
    }

    const user = userRes.rows[0];

    // Log request in audit log and create notification for Owner
    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
    });

    // Notify owner
    const ownerRes = await query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
    if (ownerRes.rows.length > 0) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'SECURITY', 'Password Reset Request', $2, 'USER', $3)`,
        [
          ownerRes.rows[0].id,
          `User ${user.full_name} (${user.role}) has requested a password reset.`,
          user.id,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted. The administrator has been notified to reset your credentials.',
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to process reset request.' } },
      { status: 500 }
    );
  }
}
