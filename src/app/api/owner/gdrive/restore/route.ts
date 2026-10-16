import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, handleAuthError } from '@/lib/permissions';
import { getGDriveSettings, downloadBackup, restoreDatabaseBackupArchive } from '@/lib/gdrive';

export async function POST(req: NextRequest) {
  try {
    await requireOwner(req);
    const body = await req.json();
    const { file_id } = body;

    if (!file_id) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    const settings = await getGDriveSettings();
    if (!settings.webhook_url) {
      return NextResponse.json({ success: false, error: 'Google Drive Webhook URL is not configured' }, { status: 400 });
    }

    const dlRes = await downloadBackup(settings.webhook_url, settings.api_key, file_id);
    if (!dlRes.success || !dlRes.rawBuffer) {
      return NextResponse.json({ success: false, error: dlRes.error || 'Failed to download file from Google Drive' }, { status: 400 });
    }

    const restoreRes = await restoreDatabaseBackupArchive(dlRes.rawBuffer);
    return NextResponse.json(restoreRes);
  } catch (error: any) {
    return handleAuthError(error);
  }
}
