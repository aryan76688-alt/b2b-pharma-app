import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, handleAuthError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    // 1. Strict Authorization: Only Super Admin Aryan Darji can access device controls
    await requireSuperAdmin(req);

    const result = await query(`
      SELECT 
        u.id as "userId",
        u.full_name as "fullName",
        u.username,
        u.role,
        u.mobile,
        u.email,
        u.status as "userStatus",
        u.last_login_at as "lastLoginAt",
        COALESCE(d.id, gen_random_uuid()) as "deviceId",
        COALESCE(d.device_name, 'Android Mobile') as "deviceName",
        COALESCE(d.device_model, 'Samsung Galaxy / Redmi') as "deviceModel",
        COALESCE(d.os_version, 'Android 14') as "osVersion",
        COALESCE(d.app_version, '1.2.0 PWA') as "appVersion",
        COALESCE(d.storage_access, true) as "storageAccess",
        COALESCE(d.storage_quota_mb, 1024) as "storageQuotaMb",
        COALESCE(d.storage_used_mb, 48.5) as "storageUsedMb",
        COALESCE(d.camera_access, true) as "cameraAccess",
        COALESCE(d.camera_mode, 'rear_and_front') as "cameraMode",
        COALESCE(d.mic_access, true) as "micAccess",
        COALESCE(d.mic_mode, 'emergency_only') as "micMode",
        COALESCE(d.remote_locked, false) as "remoteLocked",
        COALESCE(d.tracking_enabled, true) as "trackingEnabled",
        COALESCE(d.last_synced_at, timezone('utc'::text, now())) as "lastSyncedAt"
      FROM users u
      LEFT JOIN user_device_controls d ON d.user_id = u.id
      ORDER BY 
        CASE WHEN u.role = 'super_admin' THEN 1
             WHEN u.role = 'owner' THEN 2
             WHEN u.role = 'salesman' THEN 3
             ELSE 4 END,
        u.full_name ASC
    `);

    return NextResponse.json({
      success: true,
      data: {
        devices: result.rows,
        totalDevices: result.rows.length,
        superAdminAccessOnly: true,
        authorizedSuperAdmin: 'Aryan Darji (Aryan180607)',
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Authorization: Only Super Admin Aryan Darji can update device controls
    const admin = await requireSuperAdmin(req);
    const body = await req.json();

    const {
      userId,
      storageAccess,
      storageQuotaMb,
      cameraAccess,
      cameraMode,
      micAccess,
      micMode,
      remoteLocked,
      trackingEnabled,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { message: 'userId is required.' } },
        { status: 400 }
      );
    }

    // 2. Upsert Device Controls
    const updateResult = await query(
      `
      INSERT INTO user_device_controls (
        user_id,
        storage_access,
        storage_quota_mb,
        camera_access,
        camera_mode,
        mic_access,
        mic_mode,
        remote_locked,
        tracking_enabled,
        updated_at,
        updated_by,
        last_synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, timezone('utc'::text, now()), $10, timezone('utc'::text, now()))
      ON CONFLICT (user_id) DO UPDATE
      SET
        storage_access = EXCLUDED.storage_access,
        storage_quota_mb = EXCLUDED.storage_quota_mb,
        camera_access = EXCLUDED.camera_access,
        camera_mode = EXCLUDED.camera_mode,
        mic_access = EXCLUDED.mic_access,
        mic_mode = EXCLUDED.mic_mode,
        remote_locked = EXCLUDED.remote_locked,
        tracking_enabled = EXCLUDED.tracking_enabled,
        updated_at = timezone('utc'::text, now()),
        updated_by = EXCLUDED.updated_by,
        last_synced_at = timezone('utc'::text, now())
      RETURNING *
      `,
      [
        userId,
        storageAccess ?? true,
        storageQuotaMb ?? 1024,
        cameraAccess ?? true,
        cameraMode || 'rear_and_front',
        micAccess ?? true,
        micMode || 'emergency_only',
        remoteLocked ?? false,
        trackingEnabled ?? true,
        admin.id,
      ]
    );

    // 3. Log Audit Record
    await logAudit({
      userId: admin.id,
      action: 'UPDATE',
      entityType: 'user_device_controls',
      entityId: userId,
      newData: {
        storageAccess,
        cameraAccess,
        cameraMode,
        micAccess,
        micMode,
        remoteLocked,
        modifiedBySuperAdmin: 'Aryan180607',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Hardware and device permissions updated successfully by Super Admin.',
      data: updateResult.rows[0],
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
