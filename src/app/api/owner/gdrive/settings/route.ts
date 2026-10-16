import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { getGDriveSettings, saveGDriveSettings } from '@/lib/gdrive';

export async function GET(req: NextRequest) {
  try {
    await requireOwner(req);
    const settings = await getGDriveSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireOwner(req);
    const body = await req.json();
    const updated = await saveGDriveSettings({
      webhook_url: (body.webhook_url || '').trim(),
      api_key: (body.api_key || 'SHREEJI_SECRET_KEY_2026').trim(),
      folder_name: (body.folder_name || 'Shreeji_Healthcare_Backups').trim(),
      notify_email: (body.notify_email || 'shreejiseven@gmail.com').trim()
    });
    return NextResponse.json({ success: true, message: 'Google Drive settings updated successfully', settings: updated });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
